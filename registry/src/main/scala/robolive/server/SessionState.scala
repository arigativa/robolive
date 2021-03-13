package robolive.server

import robolive.server.SessionManager._

import scala.concurrent.duration.FiniteDuration
import java.util.concurrent.{ConcurrentHashMap, TimeUnit}
import scala.jdk.CollectionConverters._

trait SessionManager {
  def getOngoingSessions: Seq[OngoingSessionView]
  def getAllowedSessions: Seq[AllowedSessionView]
  def getEvictedSessions: Seq[CommunicationChannelSession]
  def allowSession(session: CommunicationChannelSession, duration: FiniteDuration): Unit
  def evictSession(session: CommunicationChannelSession): Unit
  def evictAgentSessions(agentId: String): Unit
}

object SessionManager {
  final case class CommunicationChannelSession(
    clientName: String,
    agentName: String,
  )

  final case class FiniteSession(duration: FiniteDuration, startTime: Long) {
    def timeLeft: FiniteDuration = {
      val currentTime = System.currentTimeMillis()
      val sessionEndTime = startTime + duration.toMillis
      FiniteDuration(sessionEndTime - currentTime, TimeUnit.MILLISECONDS)
    }

    def isValid: Boolean = timeLeft.toSeconds > 0
  }

  final case class OngoingSessionView(
    session: CommunicationChannelSession,
    time: FiniteSession
  )

  final case class AllowedSessionView(
    session: CommunicationChannelSession,
    duration: FiniteDuration
  )
}

final class SessionState() extends SessionManager {

  private val ongoingSessions = new ConcurrentHashMap[CommunicationChannelSession, FiniteSession]()
  private val allowedSessions = new ConcurrentHashMap[CommunicationChannelSession, FiniteDuration]()
  private val evictedSessions = ConcurrentHashMap.newKeySet[CommunicationChannelSession]()

  def isAllowed(session: CommunicationChannelSession): Boolean = {
    allowedSessions.containsKey(session)
  }

  def isOngoing(session: CommunicationChannelSession): Boolean = {
    ongoingSessions.containsKey(session)
  }

  def allowedSessionDuration(session: CommunicationChannelSession): Option[FiniteDuration] = {
    Option(allowedSessions.get(session))
  }

  def ongoingSessionDuration(session: CommunicationChannelSession): Option[FiniteDuration] = {
    Option(ongoingSessions.get(session)).map(_.timeLeft)
  }

  def getOngoingSessions: Seq[OngoingSessionView] = {
    ongoingSessions.asScala.toSeq.map {
      case (session, time) => OngoingSessionView(session, time)
    }
  }

  def getAllowedSessions: Seq[AllowedSessionView] = {
    allowedSessions.asScala.toSeq.map {
      case (session, duration) =>
        AllowedSessionView(session, duration)
    }
  }

  def getEvictedSessions: Seq[CommunicationChannelSession] = {
    evictedSessions.asScala.toSeq
  }

  def allowSession(session: CommunicationChannelSession, duration: FiniteDuration): Unit = {
    allowedSessions.put(session, duration)
    evictedSessions.remove(session)
  }

  def evictSession(session: CommunicationChannelSession): Unit = {
    evictedSessions.add(session)
    allowedSessions.remove(session)
  }

  def allocateSession(
    session: CommunicationChannelSession,
    duration: FiniteDuration,
  ): Unit = {
    val currentTime = System.currentTimeMillis()
    val sessionDuration = FiniteSession(duration, currentTime)
    ongoingSessions.put(session, sessionDuration)
    allowedSessions.remove(session)
  }

  def deallocateSession(
    session: CommunicationChannelSession
  ): Unit = {
    ongoingSessions.remove(session)
    evictedSessions.remove(session)
  }

  def getInvalidSessions: Set[CommunicationChannelSession] = {
    import scala.jdk.CollectionConverters._
    ongoingSessions
      .entrySet()
      .asScala
      .filter { entry =>
        val session = entry.getValue
        !session.isValid
      }
      .map(_.getKey)
      .toSet ++ getEvictedSessions
  }

  def evictAgentSessions(agentIdToEvict: String): Unit = {
    ongoingSessions
      .entrySet()
      .asScala
      .foreach { entry =>
        val agentId = entry.getKey.agentName
        if (agentIdToEvict == agentId) {
          evictSession(entry.getKey)
        }
      }
  }
}
