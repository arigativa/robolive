package robolive.server

import Info.InfoEndpointGrpc.InfoEndpoint
import Info.{AgentListRequest, AgentListResponse, AgentView}

import scala.concurrent.{ExecutionContext, Future}

final class InfoEndpointHandler(
  agentSystem: Server.AgentSystem,
  sessionState: SessionState,
)(implicit ec: ExecutionContext)
    extends InfoEndpoint {
  override def agentList(request: AgentListRequest): Future[AgentListResponse] = {
    Future.successful {
      val views = agentSystem.getAllActiveConnections().map { connection =>
        val isAllowed = sessionState
          .isAllowed(SessionState.CommunicationChannelSession(request.name, connection.login))
        val isOngoing = sessionState
          .isOngoing(SessionState.CommunicationChannelSession(request.name, connection.login))
        AgentView(
          status = connection.status,
          name = connection.name,
          id = connection.connectionId,
          isAvailableForConnection = isAllowed || isOngoing
        )
      }
      AgentListResponse(views)
    }
  }
}
