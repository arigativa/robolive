package robolive

import Inventory.AgentCommand

package object server {
  type SendMessage = AgentCommand => Unit

  final case class RobotState(status: String, sendMessageCallback: SendMessage)
}
