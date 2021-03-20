package robolive.server

import Info.InfoEndpointGrpc.InfoEndpoint
import Info.{AgentListRequest, AgentListResponse, AgentView}

import scala.concurrent.{ExecutionContext, Future}

final class InfoEndpointHandler(
  agentSystem: Server.AgentSystem,
)(implicit ec: ExecutionContext)
    extends InfoEndpoint {
  override def agentList(request: AgentListRequest): Future[AgentListResponse] = {
    Future {
      val agents = agentSystem.getAllActiveConnections().map {
        case (id, state) => AgentView(state.status, state.name, id)
      }
      AgentListResponse(agents.toSeq)
    }
  }
}
