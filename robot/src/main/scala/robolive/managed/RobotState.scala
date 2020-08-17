package robolive.managed

import Inventory.AgentStatus
import robolive.puppet.Puppet

final case class RobotState(
  name: String,
  status: String,
  runningPuppet: Option[Puppet],
) {
  def toAgentStatus: AgentStatus = AgentStatus(status, name)
}
