package robolive.server

import java.util.{Timer, TimerTask, UUID}
import java.util.concurrent.ConcurrentHashMap
import SipChannel.{AllocateRequest, AllocateResponse}
import SipChannel.SipChannelEndpointGrpc.SipChannelEndpoint
import org.slf4j.LoggerFactory
import robolive.server.SessionManager.CommunicationChannelSession
import sttp.client._
import sttp.client.asynchttpclient.WebSocketHandler

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

final class SipChannelEndpointHandler(
  backend: SttpBackend[Future, Nothing, WebSocketHandler],
  sessionStorage: SessionManager,
  sipUri: String,
)(implicit ec: ExecutionContext)
    extends SipChannelEndpoint {
  private val logger = LoggerFactory.getLogger(getClass)

  implicit val sttpBackend = backend

  private val DefaultSessionDuration = 60 * 60

  private val timer = new Timer("SipChannel deallocation timer")

  private val task = new TimerTask { def run(): Unit = deallocate() }

  timer.scheduleAtFixedRate(task, 0, 10 * 1000)

  private def deallocate(): Unit = {
    val sessionsToDeallocate = sessionStorage.getInvalidSessions
    logger.info(s"Deallocation of sessions: `$sessionsToDeallocate`")
    sessionsToDeallocate.foreach { session =>
      val reqBody = s"""
                 |[
                 |        { 
                 |            "username": "${session.clientName}"
                 |        },
                 |        { 
                 |            "username": "${session.agentName}"
                 |        }
                 |    ]""".stripMargin
      logger.debug(s"Sending deallocation request: `$reqBody`")
      quickRequest
        .post(uri"$sipUri/users/destroy")
        .body(reqBody)
        .send()
        .onComplete {
          case Failure(error) =>
            logger.error(s"Error during session deallocation: $session", error)

          case Success(response) =>
            if (response.code.isSuccess) {
              logger.info(s"Successfully deallocated: $session")
              sessionStorage.deallocateSession(session)
            } else {
              logger.error {
                s"Deallocation request to signalling failed, body: `${response.body}` " +
                  s"code: `${response.code}` " +
                  s"status text: `${response.statusText}`"
              }
            }
        }
    }
  }

  def allocate(
    request: AllocateRequest
  ): Future[AllocateResponse] = {
    val currentTime = System.currentTimeMillis()
    val session = CommunicationChannelSession()

    val duration: Long = DefaultSessionDuration

    quickRequest
      .post(uri"$sipUri/users/create")
      .body(s"""
               |[
               |        { 
               |            "username": "${session.clientName}",
               |            "deadline": $duration
               |        },
               |        { 
               |            "username": "${session.agentName}",
               |            "deadline": $duration
               |        }
               |    ]""".stripMargin)
      .send()
      .flatMap { response =>
        if (response.code.isSuccess) {
          Future.successful {
            sessionStorage.allocateSession(
              session,
              SessionManager.FiniteSession(duration, currentTime)
            )
            AllocateResponse(session.clientName, session.agentName, duration)
          }
        } else {
          Future.failed {
            new RuntimeException(
              s"Allocation request to signalling failed, body: `${response.body}` " +
                s"code: `${response.code}` " +
                s"status text: `${response.statusText}`"
            )
          }
        }
      }
  }
}
