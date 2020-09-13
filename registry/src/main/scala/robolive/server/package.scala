package robolive

import Agent.RegistryMessage

import scala.concurrent.Promise

package object server {
  type AgentChannel = RegistryMessage => Unit
  type Reason = String

  sealed trait AgentState

  object AgentState {
    final case class Registered(name: String, callback: AgentChannel) extends AgentState
    final case class Trying(
      name: String,
      result: Promise[Map[String, String]],
    ) extends AgentState
  }
}
