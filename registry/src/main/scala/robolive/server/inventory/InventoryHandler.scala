package robolive.server.inventory

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

import Inventory.RegistryInventoryGrpc.RegistryInventory
import Inventory.{AgentCommand, AgentStatus, SetupAgent}
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import robolive.server.AgentState

final class InventoryHandler(
  videoSrc: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  servoControllerType: String,
  robotTable: ConcurrentHashMap[String, AgentState],
) extends RegistryInventory {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  override def join(commands: StreamObserver[AgentCommand]): StreamObserver[AgentStatus] = {
    val agentId = UUID.randomUUID().toString
    val settingsSent = new AtomicBoolean(false)

    logger.info(s"agent joined: $agentId")

    new StreamObserver[AgentStatus] {
      // todo send initial command (listen to sip call)
      override def onNext(status: AgentStatus): Unit = {
        logger.info(s"status receive: $status")
        val sipName = makeAgentSipName(agentId, status.name)
        if (!settingsSent.get()) {
          commands.onNext(
            AgentCommand(
              Inventory.AgentCommand.Command.Setup(
                SetupAgent(
                  registrarUri = signallingUri,
                  protocol = "tcp",
                  sipName = sipName,
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
        robotTable.put(
          agentId,
          AgentState(
            name = status.name,
            sipName = sipName,
            status = status.status,
            sendMessageCallback = commands.onNext,
          )
        )
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

  private def makeAgentSipName(id: String, agentName: String): String = {
    locally(id) // s"$id_$agentName"
    agentName
  }
}
