package robolive.puppet

import org.freedesktop.gstreamer.Version
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

// SOFTWARE CONTROLLER
final class Puppet(
  robotName: String, // HARDWARE robot name
  videoSrc: String,
  sipRobotName: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  clientInputInterpreter: ClientInputInterpreter,
  eventListener: Puppet.PuppetEventListener,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val controller = {
    implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))

    new WebRTCController(
      videoSrc = videoSrc,
      stunServerUrl = stunUri,
      enableUserVideo = enableUserVideo,
    )
  }

  private val sipClient = {
    val sipConfig = SipConfig(
      registrarUri = signallingUri,
      name = sipRobotName,
    )

    val sipEventsHandler =
      new SIPCallEventHandler(controller, clientInputInterpreter, () => eventListener.stop())
    val registrationClientHandler = new RegistrationClientHandler(() => eventListener.stop())
    new SipClient(sipEventsHandler, registrationClientHandler, sipConfig)
  }

  def start(): Puppet = {
    logger.info(s"Starting Robolive inc. robot")
    logger.info(s"Hello, I'm $robotName")
    logger.info(s"Trying to connect to signalling `$signallingUri`")

    sipClient.start(60)

    this
  }

  def stop(): Unit = {
    sipClient.stop()
    controller.dispose()
  }
}

object Puppet {
  trait PuppetEventListener {
    def stop(): Unit
  }
}
