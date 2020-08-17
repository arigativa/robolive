package robolive.app

import robolive.managed.PuppetConnectivity.RunningPuppet
import robolive.managed.{CallPuppetSoul, RobotInventory, RobotState}

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.{Random, Try}

object ManagedRobotApp extends App {

  object InventoryConnection {
    val host: String = getEnv("INVENTORY_HOST", "localhost")
    val port: Int = getEnv("INVENTORY_PORT", "3478").toInt
    val usePlaintext: Boolean = getEnv("INVENTORY_USE_PLAINTEXT", "true").toBoolean
  }

  val inventoryClient =
    RobotInventory.buildClient(
      InventoryConnection.host,
      InventoryConnection.port,
      InventoryConnection.usePlaintext
    )

  val robotName = getEnv(
    name = "ROBOT_NAME",
    default = throw new RuntimeException("`ROBOT_NAME` environment variable is undefined")
  )

  val runningPuppet =
    new RunningPuppet(
      client = inventoryClient,
      puppetSoul = new CallPuppetSoul(),
      initialState = RobotState(
        name = robotName,
        status = "wait",
        runningPuppet = None,
      )
    )

  sys.addShutdownHook {
    runningPuppet.stop("killed by OS")
  }

  Await.result(runningPuppet.terminated, Duration.Inf)
}
