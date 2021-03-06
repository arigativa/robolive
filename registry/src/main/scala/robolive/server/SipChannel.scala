package robolive.server

import org.slf4j.LoggerFactory
import robolive.server.SessionManager.CommunicationChannelSession
import robolive.server.SipChannel.{allocateRequestBody, deallocateRequestBody}
import sttp.client._
import sttp.client.asynchttpclient.WebSocketHandler

import java.util.concurrent.TimeUnit
import java.util.{Timer, TimerTask}
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

final class SipChannel(
  backend: SttpBackend[Future, Nothing, WebSocketHandler],
  sessionStorage: SessionState,
  sipUri: String,
  allowAll: Boolean,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass)

  implicit val sttpBackend = backend

  private val timer = new Timer("SipChannel deallocation timer")

  private val task = new TimerTask { def run(): Unit = deallocate() }

  private val DefaultDuration = FiniteDuration(1, TimeUnit.HOURS)

  timer.scheduleAtFixedRate(task, 0, 10 * 1000)

  private def deallocate(): Future[Unit] = {
    val sessionsToDeallocate = sessionStorage.getInvalidSessions
    logger.info(s"Deallocation of sessions: `$sessionsToDeallocate`")
    Future.sequence(sessionsToDeallocate.map(deallocate)).map(_ => ())
  }

  def deallocate(session: CommunicationChannelSession): Future[Unit] = {
    quickRequest
      .post(uri"$sipUri/users/destroy")
      .body(deallocateRequestBody(session.clientName, session.agentName))
      .send()
      .map { response =>
        if (response.code.isSuccess) {
          logger.info(s"Successfully deallocated: $session")
          sessionStorage.deallocateSession(session)
        } else {
          val error =
            s"Deallocation request to signalling failed, body: `${response.body}` " +
              s"code: `${response.code}` " +
              s"status text: `${response.statusText}`"
          logger.error(error)
        }
      }
      .recoverWith {
        case error =>
          logger.error(s"Error during session deallocation: $session", error)
          Future.failed(error)
      }
  }

  def allocate(clientId: String, agentId: String): Future[Unit] = {
    val session = CommunicationChannelSession(clientId, agentId)
    if (allowAll) {
      allocateUnchecked(session, DefaultDuration)
    } else {
      if (sessionStorage.isAllowed(session) || sessionStorage.isOngoing(session)) {
        sessionStorage
          .allowedSessionDuration(session)
          .orElse(sessionStorage.ongoingSessionDuration(session)) match {
          case Some(duration) => allocateUnchecked(session, duration)
          case None => Future.failed(new RuntimeException(s"Session: $session not found"))
        }
      } else {
        Future.failed(new RuntimeException(s"Session: $session is not allowed"))
      }
    }
  }

  private def allocateUnchecked(
    session: CommunicationChannelSession,
    duration: FiniteDuration
  ): Future[Unit] = {
    quickRequest
      .post(uri"$sipUri/users/create")
      .body(
        allocateRequestBody(session.clientName, session.agentName, duration.toSeconds)
      )
      .send()
      .flatMap { response =>
        if (response.code.isSuccess) {
          logger.info(s"Successfully allocated: $session")
          Future.successful {
            sessionStorage.allocateSession(session, duration)
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
      .recoverWith {
        case error =>
          logger.error(s"Error during session allocation: $session", error)
          Future.failed(error)
      }
  }
}

object SipChannel {
  def allocateRequestBody(clientId: String, agentId: String, duration: Long): String = {
    s"""
        |[
        |        { 
        |            "username": "$clientId",
        |            "deadline": $duration
        |        },
        |        { 
        |            "username": "$agentId",
        |            "deadline": $duration
        |        }
        |    ]""".stripMargin
  }

  def deallocateRequestBody(clientId: String, agentId: String): String = {
    s"""
       |[
       |        { 
       |            "username": "$clientId"
       |        },
       |        { 
       |            "username": "$agentId"
       |        }
       |    ]""".stripMargin
  }
}
