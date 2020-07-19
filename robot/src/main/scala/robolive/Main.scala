package robolive

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer._
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

object Main extends App {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  val robotName = "robomachine"

  logger.info(s"Starting robot: $robotName")

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  val videoSrc = {
    val defaultVideoSrcPipeline = "videotestsrc is-live=true pattern=ball ! videoconvert"
    getEnv("VIDEO_SRC", defaultVideoSrcPipeline)
  }

  val latch = new CountDownLatch(1)

  implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))

  val controller = new WebRTCController(videoSrc)
  val sipEventsHandler = new SIPCallEventHandler(controller)
  val sipConfig = SipConfig(
    registrarUri = "localhost:9031",
    name = robotName,
    protocol = "tcp",
  )
  val sipClient = new SipClient(sipEventsHandler, sipConfig)

  latch.await()

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)

}
