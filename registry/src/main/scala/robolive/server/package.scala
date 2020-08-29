package robolive

import Inventory.AgentCommand

package object server {
  type SendMessage = AgentCommand => Unit

  final case class AgentState(
    name: String,
    sipName: String,
    status: String,
    sendMessageCallback: SendMessage,
  )
}
