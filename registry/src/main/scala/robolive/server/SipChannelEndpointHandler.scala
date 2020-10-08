package robolive.server

import java.util.UUID

import SipChannel.{AllocateRequest, AllocateResponse}
import SipChannel.SipChannelEndpointGrpc.SipChannelEndpoint
import sttp.client._
import sttp.client.asynchttpclient.WebSocketHandler

import scala.concurrent.{ExecutionContext, Future}

final class SipChannelEndpointHandler(
  backend: SttpBackend[Future, Nothing, WebSocketHandler],
  sipUri: String,
)(implicit ec: ExecutionContext)
    extends SipChannelEndpoint {
  implicit val sttpBackend = backend

  def allocate(
    request: AllocateRequest
  ): Future[AllocateResponse] = {
    locally(request)

    val clientName = UUID.randomUUID().toString
    val agentName = UUID.randomUUID().toString

    quickRequest
      .post(uri"http://$sipUri/users/create")
      .body(s"""
               |[
               |        { 
               |            "username": "$clientName",
               |            "deadline": 120
               |        },
               |        { 
               |            "username": "$agentName",
               |            "deadline": 120
               |        }
               |    ]""".stripMargin)
      .send()
      .flatMap { response =>
        if (response.code.isSuccess) {
          Future.successful {
            AllocateResponse(clientName, agentName, 120)
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
