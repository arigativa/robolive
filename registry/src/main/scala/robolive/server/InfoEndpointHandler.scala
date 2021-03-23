package robolive.server

import Info.InfoEndpointGrpc.InfoEndpoint
import Info.{AgentListRequest, AgentListResponse, AgentView}

import scala.concurrent.{ExecutionContext, Future}

final class InfoEndpointHandler(
  agentSystem: Server.AgentSystem,
)(implicit ec: ExecutionContext)
    extends InfoEndpoint {
  override def agentList(request: AgentListRequest): Future[AgentListResponse] = {
    Future.successful {
      val views = agentSystem.getAllActiveConnections().map { connection =>
        AgentView(connection.status, connection.name, connection.connectionId)
      }
      AgentListResponse(views)
    }
  }
}
