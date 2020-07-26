package robolive.managed.state

import robolive.managed.state.RobotState.ExecutingCommand
import robolive.protocols.Inventory.Command.Command
import robolive.protocols.Inventory.RobotStatus

case class RobotState(
  status: RobotStatus,
  runningCommands: List[ExecutingCommand] = Nil,
  requestedExit: Option[ExitState] = None
)

object RobotState {

  case class ExecutingCommand(command: Command, runningThread: Thread)
}
