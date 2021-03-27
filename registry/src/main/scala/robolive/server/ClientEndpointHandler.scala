package robolive.server
import Client.{JoinRequest, JoinResponse}
import org.slf4j.LoggerFactory
import scala.concurrent.{ExecutionContext, Future}

final class ClientEndpointHandler(
  agentSystem: Server.AgentSystem,
  sipChannel: SipChannel
)(
  implicit ec: ExecutionContext
) extends Client.ClientEndpointGrpc.ClientEndpoint {
  private val logger = LoggerFactory.getLogger(getClass)

  override def join(
    request: JoinRequest
  ): Future[JoinResponse] = {
    val result = agentSystem.getConnection(request.targetId) match {
      case Some(activeConnection) =>
        logger.info(s"Join ${request.name} -> ${request.targetId} (${activeConnection.login})")
        sipChannel
          .allocate(request.name, activeConnection.connectionId, activeConnection.login)
          .flatMap { _ =>
            activeConnection.join(request.name, request.settings)
          }
          .recoverWith {
            case error =>
              logger.error(
                s"Error while trying to connect from client: `${request.name}` to agent: `${request.targetId}`",
                error
              )
              Future.failed(error)
          }
      case None =>
        Future.failed(new RuntimeException(s"Can not find agent by ${request.targetId}"))
    }

    result.map { settings =>
      clientSuccessResponse(settings)
    }.recover {
      case error => clientErrorResponse(error)
    }
  }

  private def clientErrorResponse(error: Throwable) = {
    JoinResponse(
      Client.JoinResponse.Message
        .Failure(Client.JoinResponse.Failure(error.getMessage))
    )
  }

  private def clientSuccessResponse(
    settings: Map[String, String]
  ) = {
    JoinResponse(
      Client.JoinResponse.Message
        .Success(Client.JoinResponse.Success(settings))
    )
  }
}
