package robolive.server

import Session.{
  AllowSession,
  AllowedSession,
  AllowedSessions,
  EvictSession,
  EvictedSession,
  EvictedSessions,
  OngoingSession,
  OngoingSessions
}
import Common.Empty
import robolive.server.SessionState.CommunicationChannelSession

import java.util.concurrent.TimeUnit
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

final class SessionEndpointHandler(sessionState: SessionState)
    extends Session.SessionEndpointGrpc.SessionEndpoint {
  def getAllowedSessions(
    request: Empty
  ): Future[AllowedSessions] = {
    val sessions = sessionState.getAllowedSessions.map { allowedSession =>
      AllowedSession(
        clientId = allowedSession.session.clientId,
        agentId = allowedSession.session.agentId,
        durationInSeconds = allowedSession.duration.toSeconds,
      )
    }

    Future.successful(AllowedSessions(sessions))
  }

  def getEvictedSessions(
    request: Empty
  ): Future[EvictedSessions] = {
    val sessions = sessionState.getEvictedSessions.map { evictedSession =>
      EvictedSession(
        clientId = evictedSession.clientId,
        agentId = evictedSession.agentId,
      )
    }

    Future.successful(EvictedSessions(sessions))
  }

  def getOngoingSessions(
    request: Empty
  ): Future[OngoingSessions] = {
    val sessions = sessionState.getOngoingSessions.map { ongoingSession =>
      OngoingSession(
        clientId = ongoingSession.session.clientId,
        agentId = ongoingSession.session.agentId,
        durationInSeconds = ongoingSession.time.duration.toSeconds,
        timeLeftInSeconds = ongoingSession.time.timeLeft.toSeconds
      )
    }

    Future.successful(OngoingSessions(sessions))
  }

  def doAllowSession(
    request: AllowSession
  ): Future[Empty] = {
    val session = CommunicationChannelSession(
      clientId = request.clientId,
      agentId = request.agentId,
    )
    val duration = FiniteDuration(request.durationInSeconds, TimeUnit.SECONDS)
    sessionState.allowSession(session, duration)
    Future.successful(Empty.defaultInstance)
  }

  def doEvictSession(
    request: EvictSession
  ): Future[Empty] = {
    val session = CommunicationChannelSession(
      clientId = request.clientId,
      agentId = request.agentId,
    )
    sessionState.evictSession(session)
    Future.successful(Empty.defaultInstance)
  }
}
