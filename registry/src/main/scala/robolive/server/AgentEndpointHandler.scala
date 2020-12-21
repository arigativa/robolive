package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

import Agent.AgentEndpointGrpc.AgentEndpoint
import Agent._
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory

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
          case AgentMessage.Message.Register(value) =>
            logger.info(s"register `${value.name}`")

            registerHandler(responseObserver, agentId, value)

          case AgentMessage.Message.Join(value) =>
            logger.info(agentLog(s"join decision `$value`"))

            joinHandler(responseObserver, agentId, value)
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

  // fixme: remove side effect?
  private def joinHandler(
    responseObserver: StreamObserver[RegistryMessage],
    agentId: Reason,
    value: AgentMessage.JoinDecision
  ) = {
    import Agent.AgentMessage.JoinDecision.{Message => JoinMessage, _}

    agentTable.get(agentId) match {
      case state: AgentState.Trying =>
        value.message match {
          case JoinMessage.Accepted(Accepted(settings, requestId, _)) =>
            state.result.success(settings)
          case JoinMessage.Declined(Declined(reason, requestId, _)) =>
            state.result.failure(new RuntimeException(reason))
          case JoinMessage.Empty =>
        }

      case wrongState @ (null | _) =>
        responseObserver.onError(
          new RuntimeException(
            s"agent ${agentId}: incorrect state `$wrongState`, should be `Trying`"
          )
        )
    }
  }

  // fixme: remove side effect?
  private def registerHandler(
    responseObserver: StreamObserver[RegistryMessage],
    agentId: Reason,
    value: AgentMessage.RegisterRequest
  ): Unit = {
    if (agentTable.get(agentId) == null) {
      agentTable.put(agentId, AgentState.Registered(value.name, responseObserver.onNext))

      responseObserver.onNext(registerResponse)
    } else {
      val errorMessage = s"agent $agentId | ${value.name}: already registered"
      logger.error(errorMessage)
      responseObserver.onError(new RuntimeException(errorMessage))
    }
  }
}
