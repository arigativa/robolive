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

  override def register(
    responseObserver: StreamObserver[RegistryMessage]
  ): StreamObserver[AgentMessage] = {
    val agentId = UUID.randomUUID().toString

    logger.info(s"agent $agentId: joined")

    new StreamObserver[AgentMessage] {
      override def onNext(agentMessage: AgentMessage): Unit = {
        logger.info(agentMessage.toString)

        agentMessage.message match {
          case AgentMessage.Message.Empty =>
          case AgentMessage.Message.Register(value) =>
            logger.info(s"agent $agentId: register")
            if (agentTable.get(agentId) == null) {
              agentTable.put(agentId, AgentState.Registered(value.name, responseObserver.onNext))
              val response =
                RegistryMessage(
                  RegistryMessage.Message.Registered(RegistryMessage.RegisterResponse())
                )
              responseObserver.onNext(response)
            } else {
              val errorMessage = s"agent $agentId|${value.name}: already registered"
              logger.error(errorMessage)
              responseObserver.onError(new RuntimeException(errorMessage))
            }

          case AgentMessage.Message.Join(value) =>
            logger.info(s"received new join decision: $value")

            import Agent.AgentMessage.JoinDecision.{Message => JoinMessage, _}
            agentTable.get(agentId) match {
              case state: AgentState.Trying =>
                value.message match {
                  case JoinMessage.Accepted(Accepted(settings, _)) =>
                    state.result.success(settings)
                  case JoinMessage.Declined(Declined(reason, _)) =>
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
      }

      override def onError(error: Throwable): Unit = {
        logger.error(s"agent $agentId error: ${error.getMessage}", error)
        agentTable.remove(agentId)
        responseObserver.onError(error)
      }

      override def onCompleted(): Unit = {
        logger.info(s"agent `$agentId` disconnected")
        agentTable.remove(agentId)
        responseObserver.onCompleted()
      }
    }
  }
}
