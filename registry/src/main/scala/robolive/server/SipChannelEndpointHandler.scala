package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

import SipChannel.{AllocateRequest, AllocateResponse}
import SipChannel.SipChannelEndpointGrpc.SipChannelEndpoint
import sttp.client._
import sttp.client.asynchttpclient.WebSocketHandler

import scala.concurrent.{ExecutionContext, Future}

final class SipChannelEndpointHandler(
  backend: SttpBackend[Future, Nothing, WebSocketHandler],
  sessionStorage: ConcurrentHashMap[(String, String), Long],
  sipUri: String,
)(implicit ec: ExecutionContext)
    extends SipChannelEndpoint {
  implicit val sttpBackend = backend

  def allocate(
    request: AllocateRequest
  ): Future[AllocateResponse] = {
    val (clientName, agentName) = (for {
      clientName <- request.clientName
      agentName <- request.agentName
      if sessionStorage.contains((clientName, agentName))
    } yield {
      (clientName, agentName)
    }).getOrElse {
      val clientName = s"client-${UUID.randomUUID().toString}"
      val agentName = s"agent-${UUID.randomUUID().toString}"
      (clientName, agentName)
    }

    val duration: Long = request.durationSeconds.filter(_ < 600).getOrElse(600)

    quickRequest
      .post(uri"http://$sipUri/users/create")
      .body(s"""
               |[
               |        { 
               |            "username": "$clientName",
               |            "deadline": $duration
               |        },
               |        { 
               |            "username": "$agentName",
               |            "deadline": $duration
               |        }
               |    ]""".stripMargin)
      .send()
      .flatMap { response =>
        if (response.code.isSuccess) {
          Future.successful {
            sessionStorage.put((clientName, agentName), duration)
            AllocateResponse(clientName, agentName, duration)
          }
        } else {
          Future.failed {
            new RuntimeException(
              s"Request to signalling failed, body: `${response.body}` " +
                s"code: `${response.code}` " +
                s"status text: `${response.statusText}`"
            )
          }
        }
      }
  }
}
