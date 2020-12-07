package robolive.app

import java.util.concurrent.CountDownLatch

import org.slf4j.LoggerFactory
import robolive.puppet.{Puppet, ServoController}

import scala.concurrent.ExecutionContext

object CallPuppetApp extends App {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  val videoSrc: String = {
    val default =
      "nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert"
    getEnv("VIDEO_SRC", default)
  }
  val robotName: String = getEnv("ROBOT_NAME", "robomachine")
  val signallingUri: String = getEnv("SIGNALLING_URI", "rl.arigativa.ru:9031")
  val stunUri: String = getEnv("STUN_URI", "stun://rl.arigativa.ru:8080")
  val enableUserVideo: Boolean = sys.env.contains("ENABLE_USER_VIDEO")
  val servoControllerType: String = getEnv("SERVO_CONTROLLER", default = "PYTHON_SHELL")
  val servoController: ServoController = servoControllerType match {
    case "PYTHON_SHELL" => ServoController.makePythonShellServoController
    case "FAKE" => ServoController.makeFakeServoController
  }

  val puppet = new Puppet(
    videoSrc = videoSrc,
    sipRobotName = robotName,
    signallingUri = signallingUri,
    stunUri = stunUri,
    enableUserVideo = enableUserVideo,
    servoControllerType = servoControllerType,
    robotName = robotName,
    eventListener = () => ()
  )

  val kill = new CountDownLatch(1)

  sys.addShutdownHook {
    logger.info(s"Stopping $robotName")
    puppet.stop()
    kill.countDown()
  }

  puppet.start()

  logger.info(s"Stopped $robotName")
}
