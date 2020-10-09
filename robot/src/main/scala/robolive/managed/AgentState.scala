package robolive.managed
import robolive.puppet.Puppet

sealed trait AgentState

object AgentState {
  final case object Registered extends AgentState
  final case class Busy(puppet: Puppet, clientName: String, agentName: String, duration: Long)
      extends AgentState
}
