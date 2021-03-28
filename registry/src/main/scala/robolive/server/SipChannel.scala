package robolive.server

import org.slf4j.LoggerFactory
import robolive.server.SessionState.CommunicationChannelSession
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
    if (sessionsToDeallocate.nonEmpty) {
      logger.info(s"Deallocation of sessions: `$sessionsToDeallocate`")
      Future.sequence(sessionsToDeallocate.map(deallocate)).map(_ => ())
    } else Future.unit
  }

  def deallocate(session: CommunicationChannelSession): Future[Unit] = {
    quickRequest
      .post(uri"$sipUri/users/destroy")
      .body(deallocateRequestBody(session.clientId, session.agentId))
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

  def allocate(clientId: String, agentId: String, agentSessionId: String): Future[Unit] = {
    val session = CommunicationChannelSession(clientId, agentSessionId)
    if (allowAll) {
      allocateSIPSession(clientId, agentId, DefaultDuration)
        .map(_ => sessionStorage.allocateSession(session, DefaultDuration))
    } else {
      if (sessionStorage.isAllowed(session) || sessionStorage.isOngoing(session)) {
        sessionStorage
          .allowedSessionDuration(session)
          .orElse(sessionStorage.ongoingSessionDuration(session)) match {
          case Some(duration) =>
            allocateSIPSession(clientId, agentId, duration)
              .map(_ => sessionStorage.allocateSession(session, duration))
          case None =>
            Future.failed(new RuntimeException(s"Session $clientId -> $agentId not found"))
        }
      } else {
        Future.failed(new RuntimeException(s"Session $clientId -> $agentId is not allowed"))
      }
    }
  }

  private def allocateSIPSession(
    clientId: String,
    agentId: String,
    duration: FiniteDuration
  ): Future[Unit] = {
    quickRequest
      .post(uri"$sipUri/users/create")
      .body(
        allocateRequestBody(clientId, agentId, duration.toSeconds)
      )
      .send()
      .flatMap { response =>
        if (response.code.isSuccess) {
          logger.info(s"Successfully allocated: $clientId -> $agentId")
          Future.unit
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
          logger.error(s"Error during session allocation: $clientId -> $agentId", error)
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
