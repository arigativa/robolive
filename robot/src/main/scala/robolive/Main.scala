package robolive

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer._
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

object Main extends App {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  val videoSrc = {
    val default =
      "nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! videoconvert"
    getEnv("VIDEO_SRC", default)
  }
  val robotName = getEnv("ROBOT_NAME", "robomachine")
  val signallingUri = getEnv("SIGNALLING_URI", "rl.arigativa.ru:9031")

  logger.info(s"Starting Robolive inc. robot")
  logger.info(s"Hello, I'm $robotName")
  logger.info(s"Trying to connect to signalling `$signallingUri`")

  val latch = new CountDownLatch(1)

  implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))

  val controller = new WebRTCController(videoSrc)
  val sipEventsHandler = new SIPCallEventHandler(controller)
  val sipConfig = SipConfig(
    registrarUri = signallingUri,
    name = robotName,
    protocol = "tcp",
  )
  val sipClient = new SipClient(sipEventsHandler, sipConfig)

  latch.await()

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)

}
