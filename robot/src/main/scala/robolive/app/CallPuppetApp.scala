package robolive.app

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer.Version
import org.slf4j.LoggerFactory
import robolive.{
  PythonShellServoController,
  SIPCallEventHandler,
  ServoController,
  SipClient,
  SipConfig,
  WebRTCController
}
import robolive.call.SipWebrtcPuppet
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

object CallPuppetApp extends App {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  val videoSrc = {
    val default =
      "nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert"
    getEnv("VIDEO_SRC", default)
  }
  val robotName = getEnv("ROBOT_NAME", "robomachine")
  val signallingUri = getEnv("SIGNALLING_URI", "rl.arigativa.ru:9031")
  val servoControllerType = getEnv("SERVO_CONTROLLER", default = "PYTHON_SHELL")
  val servoController = servoControllerType match {
    case "PYTHON_SHELL" => ServoController.makePythonShellServoController
    case "FAKE" => ServoController.makeFakeServoController
  }

  logger.info(s"Starting Robolive inc. robot")
  logger.info(s"Hello, I'm $robotName")
  logger.info(s"Trying to connect to signalling `$signallingUri`")

  val sipConfig = SipConfig(
    registrarUri = signallingUri,
    name = robotName,
    protocol = "tcp",
  )

  implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))
  val controller = new WebRTCController(videoSrc, servoController)

  val latch = new CountDownLatch(1)
  sys.addShutdownHook {
    logger.info(s"Stopping $robotName")
    try {
      logger.info(s"Disposing allocated resources of $robotName")
      gstInit.dispose()
    } finally {
      logger.info(s"Stopped $robotName")
      latch.countDown()
    }
  }

  val sipEventsHandler = new SIPCallEventHandler(controller)
  val sipClient = new SipClient(sipEventsHandler, sipConfig)

  latch.await()
}
