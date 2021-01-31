package robolive.server
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

final class SessionManager() {
  import SessionManager._

  private val sessions = new ConcurrentHashMap[CommunicationChannelSession, FiniteSession]()

  def allocateSession(
    session: CommunicationChannelSession,
    sessionDuration: FiniteSession,
  ): Unit = {
    sessions.put(session, sessionDuration)
  }

  def deallocateSession(
    session: CommunicationChannelSession
  ): Unit = {
    sessions.remove(session)
  }

  def getInvalidSessions: Set[CommunicationChannelSession] = {
    import scala.jdk.CollectionConverters._

    val currentTime = System.currentTimeMillis()
    sessions
      .entrySet()
      .asScala
      .filter { entry =>
        val duration = entry.getValue
        (currentTime - duration.startTime) > (duration.durationInSeconds * 1000)
      }
      .map(_.getKey)
      .toSet
  }
}

object SessionManager {
  final case class CommunicationChannelSession(
    clientName: String,
    agentName: String,
  )

  object CommunicationChannelSession {
    def apply(): CommunicationChannelSession = {
      val clientName = s"client-${UUID.randomUUID().toString}"
      val agentName = s"agent-${UUID.randomUUID().toString}"
      CommunicationChannelSession(clientName = clientName, agentName = agentName)
    }
  }

  final case class FiniteSession(durationInSeconds: Long, startTime: Long)
}
