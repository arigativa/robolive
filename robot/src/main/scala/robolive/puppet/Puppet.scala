package robolive.puppet

import org.freedesktop.gstreamer.{Pipeline, Version}
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

// SOFTWARE CONTROLLER
final class Puppet(
  pipeline: Pipeline,
  sipRobotName: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  clientInputInterpreter: ClientInputInterpreter,
  eventListener: Puppet.PuppetEventListener,
)(implicit ec: ExecutionContext, gstInit: GstManaged.GSTInit.type) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val controller =
    new WebRTCController(
      pipeline = pipeline,
      stunServerUrl = stunUri,
      enableUserVideo = enableUserVideo,
    )

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
    logger.info(s"Trying to connect to signalling `$signallingUri`")

    sipClient.start(60)

    this
  }

  def stop(): Unit = {
    pipeline.stop()
    pipeline.dispose()
    sipClient.stop()
    controller.dispose()
  }
}

object Puppet {
  trait PuppetEventListener {
    def stop(): Unit
  }
}
