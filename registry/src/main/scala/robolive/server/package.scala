package robolive

import Inventory.AgentCommand

package object server {
  type SendMessage = AgentCommand => Unit

  final case class AgentState(status: String, name: String, sendMessageCallback: SendMessage)
}
