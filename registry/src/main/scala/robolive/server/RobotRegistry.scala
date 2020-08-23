package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

import Inventory.{AgentCommand, AgentStatus, SetupAgent}
import Inventory.RegistryInventoryGrpc.RegistryInventory
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory

final class RobotRegistry(
  videoSrc: String,
  sipRobotName: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  servoControllerType: String,
  robotTable: ConcurrentHashMap[String, RobotState],
) extends RegistryInventory {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  override def join(commands: StreamObserver[AgentCommand]): StreamObserver[AgentStatus] = {
    val agentId = UUID.randomUUID().toString
    val settingsSent = new AtomicBoolean(false)

    logger.info(s"robot joined: $agentId")

    new StreamObserver[AgentStatus] {
      // todo send initial command (listen to sip call)
      override def onNext(status: AgentStatus): Unit = {
        logger.info(s"status receive: $status")
        if (!settingsSent.get()) {
          commands.onNext(
            AgentCommand(
              Inventory.AgentCommand.Command.Setup(
                SetupAgent(
                  registrarUri = signallingUri,
                  protocol = "tcp",
                  username = sipRobotName,
                  stunUri = stunUri,
                  videoSrc = videoSrc,
                  enableUserVideo = enableUserVideo,
                  servoControllerType = servoControllerType,
                  id = agentId,
                )
              )
            )
          )
          settingsSent.set(true)
        }
        robotTable.put(agentId, RobotState(status.status, commands.onNext))
      }

      override def onError(error: Throwable): Unit = {
        logger.error(s"agent error ${error.getMessage}", error)
        robotTable.remove(agentId)
        commands.onError(error)
      }

      override def onCompleted(): Unit = {
        logger.info(s"agent `$agentId` disconnected")
        robotTable.remove(agentId)
        commands.onCompleted()
      }
    }
  }
}
