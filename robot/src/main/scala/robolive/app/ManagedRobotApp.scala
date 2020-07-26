package robolive.app

import robolive.managed.PuppetConnectivity.RunningPuppet
import robolive.managed.state.{ExitState, RobotState}
import robolive.managed.{Inventory, PuppetSoul}
import robolive.protocols.Inventory.RobotStatus
import robolive.protocols.Robot.{RobotID, RobotShortDescription}

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.{Random, Try}

object ManagedRobotApp {

  object Robot {
    val id: RobotID = RobotID(getEnv("ROBOT_ID", s"PUPPET-${Math.abs(Random.nextInt()) % 1000}"))
    val desc: RobotShortDescription = RobotShortDescription(id, id.value) // todo put build/revision info into description
  }

  object InventoryConnection {
    val host: String = getEnv("INVENTORY_HOST", "localhost")
    val port: Int = getEnv("INVENTORY_PORT", "3478").toInt
    val usePlaintext: Boolean = getEnv("INVENTORY_USE_PLAINTEXT", "true").toBoolean
  }

  val inventoryClient =
    Inventory.buildClient(
      InventoryConnection.host,
      InventoryConnection.port,
      InventoryConnection.usePlaintext
    )

  val defaultVideoSrc = {
    val defaultVideoSrcPipeline = "videotestsrc is-live=true pattern=ball ! videoconvert"
    getEnv("VIDEO_SRC", defaultVideoSrcPipeline)
  }

  val runningPuppet =
    new RunningPuppet(
      inventoryClient,
      PuppetSoul.DefaultCommandExecutor(defaultVideoSrc),
      initialState = RobotState(RobotStatus(Robot.desc))
    )

  sys.addShutdownHook {
    runningPuppet.stop("killed by OS")
  }

  val exitState =
    Try {
      Await.result(runningPuppet.terminated, Duration.Inf)
    }.fold(
      err => ExitState(-1, lastError = Some(err.toString)),
      identity
    )

  ExitState.writeState(exitState) // todo: implement the inside
  sys.exit(exitState.exitCode)
}
