package robolive.server.client

import Client.{AddUIDescriptionRequest, GetUIDescriptionRequest, JoinRequest, JoinResponse}
import Common.Empty
import org.slf4j.LoggerFactory
import robolive.server.Server
import robolive.server.sip.SipChannel

import scala.concurrent.{ExecutionContext, Future}

final class ClientEndpointHandler(
  userState: UserState,
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
  def addUiDescription(
    request: AddUIDescriptionRequest
  ): Future[Empty] = {
    agentSystem.getConnection(request.targetId) match {
      case Some(activeConnection) =>
        logger.info(
          s"AddUiDescription ${request.name} -> ${request.targetId} (${activeConnection.login})"
        )
        val uiDescription =
          UserState.UIDescription(
            request.uiDescription.buttons.map(b => UserState.Button(b.name, b.template))
          )

        userState
          .addUIDescription(request.name, request.name, activeConnection.login, uiDescription)
        Future.successful(Empty.defaultInstance)

      case None =>
        Future.failed(new RuntimeException(s"Can not find agent by ${request.targetId}"))
    }
  }

  def getUiDescription(
    request: GetUIDescriptionRequest
  ): Future[Client.UIDescription] = {
    agentSystem.getConnection(request.targetId) match {
      case Some(activeConnection) =>
        logger.info(
          s"GetUiDescription ${request.name} -> ${request.targetId} (${activeConnection.login})"
        )

        userState
          .getUIDescription(request.name, request.name, activeConnection.login) match {
          case Some(uiDescription) =>
            Future.successful {
              Client.UIDescription(
                uiDescription.buttons.map(b => Client.Button(b.name, b.template))
              )
            }

          case None =>
            Future.failed(
              new RuntimeException(s"Can not find UIDescription for ${request.targetId}")
            )
        }

      case None =>
        Future.failed(new RuntimeException(s"Can not find agent by ${request.targetId}"))
    }
  }
}
