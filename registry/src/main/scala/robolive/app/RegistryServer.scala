package robolive.app

import java.util.concurrent.ConcurrentHashMap

import Control.RegistryControlGrpc.RegistryControl
import Inventory.RegistryInventoryGrpc.RegistryInventory
import io.grpc.{ServerBuilder, ServerServiceDefinition}
import robolive.server
import robolive.server.control.{ControlHandler, ControlJsonEndpoint}
import robolive.server.inventory.InventoryHandler

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

object RegistryServer extends App {
  val InventoryPort = getEnv("REGISTRY_PORT_FOR_ROBOT", "3478").toInt
  val ControlPort = getEnv("REGISTRY_PORT_FOR_OPERATOR", "3479").toInt
  val ControlPortJson = getEnv("REGISTRY_PORT_FOR_OPERATOR_JSON", "3480").toInt

  val videoSrc: String = {
    val default =
      "nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert"
    getEnv("VIDEO_SRC", default)
  }
  val signallingUri: String = getEnv("SIGNALLING_URI", "rl.arigativa.ru:9031")
  val stunUri: String = getEnv("STUN_URI", "stun://rl.arigativa.ru:8080")

  val enableUserVideo: Boolean = sys.env.contains("ENABLE_USER_VIDEO")

  val servoControllerType: String = getEnv("SERVO_CONTROLLER", default = "PYTHON_SHELL")

  val robotsState = new ConcurrentHashMap[String, server.AgentState]()

  val inventoryHandler = {
    val robotRegistry = new InventoryHandler(
      signallingUri = signallingUri,
      stunUri = stunUri,
      enableUserVideo = enableUserVideo,
      servoControllerType = servoControllerType,
      videoSrc = videoSrc,
      robotTable = robotsState,
    )

    runServer(
      ssd = RegistryInventory.bindService(robotRegistry, global),
      port = InventoryPort
    )
  }

  val controlHandler = {
    val control = new ControlHandler(robotsState)
    runServer(
      ssd = RegistryControl.bindService(control, global),
      port = ControlPort
    )
  }

  val controlJsonHandler = {
    val control = new ControlHandler(robotsState)
    val controlJsonEndpoint = new ControlJsonEndpoint(control)(global)
    runServer(
      ssd = controlJsonEndpoint.definition,
      port = ControlPortJson
    )
  }

  Await.result(inventoryHandler, Duration.Inf)
  Await.result(controlHandler, Duration.Inf)
  Await.result(controlJsonHandler, Duration.Inf)

  def runServer(ssd: ServerServiceDefinition, port: Int): Future[Unit] =
    Future {
      val serverBuilder = ServerBuilder.forPort(port).addService(ssd).asInstanceOf[ServerBuilder[_]]
      val server = serverBuilder.build.start

      // make sure our server is stopped when jvm is shut down
      Runtime.getRuntime.addShutdownHook(new Thread() {
        override def run(): Unit = server.shutdown()
      })

      server.awaitTermination()
    }

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)
}
