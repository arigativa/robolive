package robolive.server

import java.util.concurrent.ConcurrentHashMap

import Info.InfoEndpointGrpc.InfoEndpoint
import Info.{AgentListRequest, AgentListResponse, AgentView}

import scala.concurrent.{ExecutionContext, Future}

final class InfoEndpointHandler(
  robotTable: ConcurrentHashMap[String, AgentState],
)(implicit ec: ExecutionContext)
    extends InfoEndpoint {
  import scala.jdk.CollectionConverters._

  override def agentList(request: AgentListRequest): Future[AgentListResponse] = {
    Future {
      val agents = robotTable.asScala.map {
        case (id, state) => AgentView(state.status, state.name, id)
      }
      AgentListResponse(agents.toSeq)
    }
  }
}
