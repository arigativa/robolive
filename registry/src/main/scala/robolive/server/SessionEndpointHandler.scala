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
import robolive.server.SessionManager.CommunicationChannelSession

import java.util.concurrent.TimeUnit
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

final class SessionEndpointHandler(sessionState: SessionManager)
    extends Session.SessionEndpointGrpc.SessionEndpoint {
  def getAllowedSessions(
    request: Empty
  ): Future[AllowedSessions] = {
    val sessions = sessionState.getAllowedSessions.map { allowedSession =>
      AllowedSession(
        clientId = allowedSession.session.clientName,
        agentId = allowedSession.session.agentName,
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
        clientId = evictedSession.clientName,
        agentId = evictedSession.agentName,
      )
    }

    Future.successful(EvictedSessions(sessions))
  }

  def getOngoingSessions(
    request: Empty
  ): Future[OngoingSessions] = {
    val sessions = sessionState.getOngoingSessions.map { ongoingSession =>
      OngoingSession(
        clientId = ongoingSession.session.clientName,
        agentId = ongoingSession.session.agentName,
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
      clientName = request.clientId,
      agentName = request.agentId,
    )
    val duration = FiniteDuration(request.durationInSeconds, TimeUnit.SECONDS)
    sessionState.allowSession(session, duration)
    Future.successful(Empty.defaultInstance)
  }

  def doEvictSession(
    request: EvictSession
  ): Future[Empty] = {
    val session = CommunicationChannelSession(
      clientName = request.clientId,
      agentName = request.agentId,
    )
    sessionState.evictSession(session)
    Future.successful(Empty.defaultInstance)
  }
}
