package robolive.server
import java.util.concurrent.ConcurrentHashMap
import Agent.RegistryMessage
import Client.{JoinRequest, JoinResponse}

import java.util.UUID
import scala.concurrent.{ExecutionContext, Future, Promise}

final class ClientEndpointHandler(robotTable: ConcurrentHashMap[String, AgentState])(
  implicit ec: ExecutionContext
) extends Client.ClientEndpointGrpc.ClientEndpoint {

  override def join(
    request: JoinRequest
  ): Future[JoinResponse] = {
    val state = robotTable.get(request.targetId)
    val result = state.send(request.name, request.settings)

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
