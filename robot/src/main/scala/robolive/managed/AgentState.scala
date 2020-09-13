package robolive.managed
import robolive.puppet.Puppet

sealed trait AgentState

object AgentState {
  final case object Registered extends AgentState
  final case class Busy(puppet: Puppet) extends AgentState
}
