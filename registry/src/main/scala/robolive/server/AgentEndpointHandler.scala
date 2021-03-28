package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

import Agent.AgentEndpointGrpc.AgentEndpoint
import Agent.AgentMessage.Message
import Agent._
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import java.util.concurrent.atomic.AtomicReference

import robolive.server.Server.Credentials

import scala.concurrent.Promise

final class AgentEndpointHandler(agentSystem: Server.AgentSystem) extends AgentEndpoint {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private def registerResponse(
    connectionId: String,
    login: String,
    password: String,
  ) = RegistryMessage(
    RegistryMessage.Message.Registered(
      RegistryMessage.RegisterResponse(connectionId, login, password)
    )
  )

  override def register(
    responseObserver: StreamObserver[RegistryMessage]
  ): StreamObserver[AgentMessage] = {
    val connectionId = UUID.randomUUID().toString

    def agentLog(message: String) = s"agent $connectionId: $message"

    logger.info(agentLog("joined"))

    new StreamObserver[AgentMessage] {
      override def onNext(agentMessage: AgentMessage): Unit = {
        logger.info(agentLog(agentMessage.toString))

        agentMessage.message match {
          case AgentMessage.Message.Empty =>
          case AgentMessage.Message.Register(message) =>
            logger.info(s"register `${message.name}")

            try {
              val (login, password) = agentSystem.newConnection(
                connectionId = connectionId,
                name = message.name,
                sendToAgent = responseObserver.onNext,
                credsOpt = message.login.zip(message.password).map { case (l, p) => Credentials(l, p) },
              )
              responseObserver.onNext(registerResponse(connectionId, login, password))
            } catch {
              case err: Exception =>
                responseObserver.onError(err)
            }

          case AgentMessage.Message.Join(message) =>
            logger.info(agentLog(s"join decision `$message`"))

            import Agent.AgentMessage.JoinDecision.{Message => JoinMessage, _}

            message.message match {
              case JoinMessage.Accepted(Accepted(settings, requestId, _)) =>
                agentSystem.getConnection(connectionId).foreach(_.success(requestId, settings))

              case JoinMessage.Declined(Declined(reason, requestId, _)) =>
                agentSystem.getConnection(connectionId).foreach(_.fail(requestId, reason))

              case JoinMessage.Empty =>
            }

          case Message.StatusUpdate(message) =>
            agentSystem.getConnection(connectionId).foreach(_.updateStatus(message.status))
        }
      }

      override def onError(error: Throwable): Unit = {
        logger.error(agentLog(s"${error.getMessage}"), error)
        agentSystem.removeConnection(connectionId)
        responseObserver.onError(error)
      }

      override def onCompleted(): Unit = {
        logger.info(agentLog("disconnected"))
        agentSystem.removeConnection(connectionId)
        responseObserver.onCompleted()
      }
    }
  }
}
