package robolive.server.control

import java.util.concurrent.ConcurrentHashMap

import Control.RegistryControlGrpc.RegistryControl
import Control._
import Inventory.{AgentCommand, RestartAgent}
import robolive.server.AgentState

import scala.concurrent.{ExecutionContext, Future}

final class ControlHandler(
  robotTable: ConcurrentHashMap[String, AgentState],
)(implicit ec: ExecutionContext)
    extends RegistryControl {
  import scala.jdk.CollectionConverters._

  override def agentList(request: AgentListRequest): Future[AgentListResponse] = {
    Future {
      val agents = robotTable.asScala.map {
        case (id, state) => AgentView(state.status, state.name, id)
      }
      AgentListResponse(agents.toSeq)
    }
  }

  override def restartAgent(request: RestartAgentRequest): Future[RestartAgentResponse] = {
    val callback = robotTable.asScala.get(request.id).map(_.sendMessageCallback)
    callback match {
      case Some(call) =>
        Future {
          call(AgentCommand(AgentCommand.Command.Restart(RestartAgent())))
          RestartAgentResponse()
        }

      case None =>
        Future.failed(new RuntimeException(s"agent `${request.id}` not found"))
    }
  }
}
