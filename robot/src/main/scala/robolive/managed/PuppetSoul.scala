package robolive.managed

import robolive.SipConfig
import robolive.call.SipWebrtcPuppet
import robolive.managed.state.RobotState.ExecutingCommand
import robolive.managed.state.{ExitState, RobotState}
import robolive.protocols.Inventory.Command.{Command, PuppetCall, RestartRobot}

import scala.concurrent.ExecutionContext

trait PuppetSoul {
  def executeCommand(currentState: RobotState)(receivedCommand: Command): RobotState
}

object PuppetSoul {

  def DefaultCommandExecutor(
                            defaultVideoSrc: String,
                            )(implicit ec: ExecutionContext): PuppetSoul =
    new PuppetSoul {
      override def executeCommand(currentState: RobotState)(receivedCommand: Command): RobotState = {
        receivedCommand match {

          case Command.Empty =>
            currentState

          case Command.PuppetCall(PuppetCall(sipConfig, videoSrc, _)) =>
            cancelAllCommands(currentState)
            runCommand(currentState)(receivedCommand) { () =>
              val name = currentState.status.description.name
              SipWebrtcPuppet.run(
                name, videoSrc.getOrElse(defaultVideoSrc),
                SipConfig(sipConfig.registrarUri, sipConfig.username.getOrElse(name), sipConfig.protocol)
              )
            }

          case Command.Restart(RestartRobot(updateToRecent, rebootSystem, _)) =>
            cancelAllCommands(currentState)
            currentState.copy(
              requestedExit = Some(
                ExitState(0, updateToRecent.getOrElse(false), rebootSystem.getOrElse(false))
              )
            )
        }
      }

      private def cancelAllCommands(currentState: RobotState): RobotState = {
        currentState.runningCommands.foreach { cmd =>
          cmd.runningThread.interrupt()
        }
        currentState.copy(runningCommands = Nil)
      }

      private def runCommand(currentState: RobotState)(command: Command)(code: () => Unit): RobotState = {
        val newThread = new Thread(() => code())
        val executingCommand = ExecutingCommand(command, newThread)
        currentState.copy(runningCommands = executingCommand :: currentState.runningCommands)
      }
    }
}
