package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import Agent.AgentEndpointGrpc.AgentEndpoint
import Agent.AgentMessage.Message
import Agent._
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory

import java.util.concurrent.atomic.AtomicReference
import scala.concurrent.Promise

final class AgentEndpointHandler(
  agentTable: ConcurrentHashMap[String, AgentState],
) extends AgentEndpoint {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val registerResponse = RegistryMessage(
    RegistryMessage.Message.Registered(RegistryMessage.RegisterResponse())
  )

  override def register(
    responseObserver: StreamObserver[RegistryMessage]
  ): StreamObserver[AgentMessage] = {
    val agentId = UUID.randomUUID().toString

    def agentLog(message: String) = s"agent $agentId: $message"

    logger.info(agentLog("joined"))

    new StreamObserver[AgentMessage] {
      override def onNext(agentMessage: AgentMessage): Unit = {
        logger.info(agentLog(agentMessage.toString))

        agentMessage.message match {
          case AgentMessage.Message.Empty =>
          case AgentMessage.Message.Register(message) =>
            logger.info(s"register `${message.name}")

            if (agentTable.get(agentId) == null) {
              val agentState = new AgentState(
                name = message.name,
                statusRef = new AtomicReference[String]("Status unknown"),
                sendToAgent = responseObserver.onNext,
                requests = new ConcurrentHashMap[String, Promise[Map[String, String]]]()
              )
              agentTable.put(agentId, agentState)

              responseObserver.onNext(registerResponse)
            } else {
              val errorMessage = s"agent $agentId | ${message.name}: already registered"
              logger.error(errorMessage)
              responseObserver.onError(new RuntimeException(errorMessage))
            }

          case AgentMessage.Message.Join(message) =>
            logger.info(agentLog(s"join decision `$message`"))

            import Agent.AgentMessage.JoinDecision.{Message => JoinMessage, _}

            message.message match {
              case JoinMessage.Accepted(Accepted(settings, requestId, _)) =>
                agentTable.get(agentId).success(requestId, settings)
              case JoinMessage.Declined(Declined(reason, requestId, _)) =>
                agentTable.get(agentId).fail(requestId, reason)
              case JoinMessage.Empty =>
            }

          case Message.StatusUpdate(message) =>
            val agentState = agentTable.get(agentId)
            if (agentState != null) {
              agentState.updateStatus(message.status)
            }
        }
      }

      override def onError(error: Throwable): Unit = {
        logger.error(agentLog(s"${error.getMessage}"), error)
        agentTable.remove(agentId)
        responseObserver.onError(error)
      }

      override def onCompleted(): Unit = {
        logger.info(agentLog("disconnected"))
        agentTable.remove(agentId)
        responseObserver.onCompleted()
      }
    }
  }
}
