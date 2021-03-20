package robolive.puppet

import org.freedesktop.gstreamer.{Pipeline, Version}
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

// SOFTWARE CONTROLLER
final class Puppet(
  pipeline: Pipeline,
  gstInit: GstManaged.GSTInit.type,
  sipAgentName: String,
  signallingUri: String,
  stunUri: String,
  enableUserVideo: Boolean,
  clientInputInterpreter: ClientInputInterpreter,
  eventListener: Puppet.PuppetEventListener,
)(implicit ec: ExecutionContext) {
  private implicit val gst = gstInit

  private val controller =
    new WebRTCController(
      pipeline = pipeline,
      stunServerUrl = stunUri,
      enableUserVideo = enableUserVideo,
    )

  private val sipClient = {
    val sipConfig = SipConfig(
      registrarUri = signallingUri,
      name = sipAgentName,
    )

    val sipEventsHandler =
      new SIPCallEventHandler(controller, clientInputInterpreter, () => eventListener.stop())
    val registrationClientHandler = new RegistrationClientHandler(() => eventListener.stop())
    new SipClient(sipEventsHandler, registrationClientHandler, sipConfig)
  }

  sipClient.start(60)

  def stop(): Unit = synchronized {
    sipClient.stop()
    controller.dispose()
  }
}

object Puppet {
  trait PuppetEventListener {
    def stop(): Unit
  }
}
