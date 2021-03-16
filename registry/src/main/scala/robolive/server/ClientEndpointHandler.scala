package robolive.server
import Client.{JoinRequest, JoinResponse}
import org.slf4j.LoggerFactory
import robolive.server.SessionManager.CommunicationChannelSession

import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.{ExecutionContext, Future}

final class ClientEndpointHandler(
  robotTable: ConcurrentHashMap[String, AgentState],
  sipChannel: SipChannel
)(
  implicit ec: ExecutionContext
) extends Client.ClientEndpointGrpc.ClientEndpoint {
  private val logger = LoggerFactory.getLogger(getClass)

  override def join(
    request: JoinRequest
  ): Future[JoinResponse] = {
    val robotState = robotTable.get(request.targetId)
    val result = sipChannel
      .allocate(request.name, request.targetId)
      .flatMap(_ => robotState.send(request.name, request.settings))
      .recoverWith {
        case error =>
          logger.error(
            s"Error while trying to connect from client: `${request.name}` to agent: `${request.targetId}`",
            error
          )
          Future.failed(error)
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
