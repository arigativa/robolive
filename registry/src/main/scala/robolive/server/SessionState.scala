package robolive.server

import robolive.server.SessionState._

import java.io.FileNotFoundException
import scala.concurrent.duration.FiniteDuration
import java.util.concurrent.{ConcurrentHashMap, TimeUnit}
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success}

object SessionState {
  def apply(storage: SessionStorage): SessionState = {
    val ongoingSessions = new ConcurrentHashMap[CommunicationChannelSession, FiniteSession]()
    val allowedSessions = new ConcurrentHashMap[CommunicationChannelSession, FiniteDuration]()

    storage.read() match {
      case Failure(_: FileNotFoundException) =>
        val empty = SessionStorage.SessionStorageData(Seq.empty, Seq.empty)
        storage.write(empty)
        new SessionState(storage, ongoingSessions, allowedSessions)

      case Failure(error) => throw error

      case Success(sessions) =>
        sessions.allowedSessions.foreach { session =>
          allowedSessions
            .put(
              CommunicationChannelSession(session.clientId, session.agentId),
              FiniteDuration(session.durationInSeconds, TimeUnit.SECONDS),
            )
        }

        sessions.ongoingSessions.foreach { session =>
          ongoingSessions.put(
            CommunicationChannelSession(session.clientId, session.agentId),
            FiniteSession(
              FiniteDuration(session.durationInSeconds, TimeUnit.SECONDS),
              session.startTime
            )
          )
        }

        new SessionState(storage, ongoingSessions, allowedSessions)
    }
  }

  final case class CommunicationChannelSession(
    clientId: String,
    agentId: String,
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

final class SessionState(
  storage: SessionStorage,
  ongoingSessions: ConcurrentHashMap[CommunicationChannelSession, FiniteSession],
  allowedSessions: ConcurrentHashMap[CommunicationChannelSession, FiniteDuration],
) {

  private val evictedSessions = ConcurrentHashMap.newKeySet[CommunicationChannelSession]()

  private def dump(): Unit = {
    val ongoingPersinstent = ongoingSessions.asScala.map {
      case (session, time) =>
        SessionStorage.OngoingPersistentSession(
          clientId = session.clientId,
          agentId = session.agentId,
          durationInSeconds = time.duration.toSeconds,
          startTime = time.startTime
        )
    }.toSeq

    val allowedPersistent = allowedSessions.asScala.map {
      case (session, duration) =>
        SessionStorage
          .AllowedPersistentSession(
            clientId = session.clientId,
            agentId = session.agentId,
            durationInSeconds = duration.toSeconds,
          )
    }.toSeq

    val dataToStore = SessionStorage.SessionStorageData(
      ongoingPersinstent,
      allowedPersistent
    )

    storage.write(dataToStore)
  }

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
    dump()
  }

  def evictSession(session: CommunicationChannelSession): Unit = {
    evictedSessions.add(session)
    allowedSessions.remove(session)
    dump()
  }

  def allocateSession(
    session: CommunicationChannelSession,
    duration: FiniteDuration,
  ): Unit = {
    val currentTime = System.currentTimeMillis()
    val sessionDuration = FiniteSession(duration, currentTime)
    ongoingSessions.put(session, sessionDuration)
    allowedSessions.remove(session)
    dump()
  }

  def deallocateSession(
    session: CommunicationChannelSession
  ): Unit = {
    ongoingSessions.remove(session)
    evictedSessions.remove(session)
    dump()
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
}
