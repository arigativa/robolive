package robolive.puppet

import java.util.UUID

import org.freedesktop.gstreamer.Version
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.{ExecutionContext, Future, Promise}

// SOFTWARE CONTROLLER
final class Puppet(
  robotName: String, // HARDWARE robot name
  videoSrc: String,
  sipRobotName: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  servoControllerType: String,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val controller = {
    implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))

    val servoController: ServoController = servoControllerType match {
      case "PYTHON_SHELL" => ServoController.makePythonShellServoController
      case "FAKE" => ServoController.makeFakeServoController
    }

    new WebRTCController(
      videoSrc = videoSrc,
      stunServerUrl = stunUri,
      servoController = servoController,
      enableUserVideo = enableUserVideo,
    )
  }

  def start(): Unit = {
    logger.info(s"Starting Robolive inc. robot")
    logger.info(s"Hello, I'm $robotName")
    logger.info(s"Trying to connect to signalling `$signallingUri`")

    val sipConfig = SipConfig(
      registrarUri = signallingUri,
      name = sipRobotName,
      protocol = "tcp",
    )

    val sipEventsHandler = new SIPCallEventHandler(controller)
    new SipClient(sipEventsHandler, sipConfig)
  }

  def stop(): Unit = { // TODO: stop SIPClient
    controller.dispose()
  }
}
