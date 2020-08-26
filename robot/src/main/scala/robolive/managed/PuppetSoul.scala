package robolive.managed

import Inventory.{AgentCommand, SetupAgent}
import Inventory.AgentCommand.Command
import org.slf4j.LoggerFactory
import robolive.puppet.Puppet

import scala.concurrent.{ExecutionContext, Future}

trait PuppetSoul {
  def executeCommand(
    currentState: RobotState,
    receivedCommand: AgentCommand,
  ): RobotState
}

final class CallPuppetSoul()(implicit ec: ExecutionContext) extends PuppetSoul {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  override def executeCommand(
    currentState: RobotState,
    receivedCommand: AgentCommand,
  ): RobotState = {
    receivedCommand.command match {
      case Command.Empty => currentState
      case Command.Setup(settings) =>
        logger.info(s"setup received: $settings")
        currentState.runningPuppet match {
          case Some(runningPuppet) =>
            runningPuppet.stop()
            startPuppet(currentState, settings)

          case None =>
            startPuppet(currentState, settings)
        }
      case Command.Restart(_) =>
        logger.info(s"restart received")
        currentState.copy(status = "exit")
    }
  }

  private def startPuppet(
    currentState: RobotState,
    settings: SetupAgent
  ): RobotState = {
    val puppet = new Puppet(
      robotName = currentState.name,
      videoSrc = settings.videoSrc,
      sipRobotName = settings.username,
      signallingUri = settings.registrarUri,
      stunUri = settings.stunUri,
      enableUserVideo = settings.enableUserVideo,
      servoControllerType = settings.servoControllerType,
    )

    puppet.start()

    RobotState(
      name = currentState.name,
      status = "wait",
      runningPuppet = Some(puppet),
    )
  }
}
