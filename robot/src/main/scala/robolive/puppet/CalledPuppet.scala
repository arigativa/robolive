package robolive.puppet

import org.freedesktop.gstreamer.{Pipeline, Version}
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

// SOFTWARE CONTROLLER
final class CalledPuppet(
  pipeline: Pipeline,
  gstInit: GstManaged.GSTInit.type,
  sipAgentName: String,
  signallingUri: String,
  rawStunUri: String,
  clientInputInterpreter: ClientInputInterpreter,
  eventListener: CalledPuppet.PuppetEventListener,
)(implicit ec: ExecutionContext) {
  private implicit val gst = gstInit

  private val stunUri = rawStunUri.replaceAll("stun:", "stun://")
  private val controller =
    new WebRTCController(
      videoSourcePipeline = pipeline,
      stunServerUrl = stunUri,
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

object CalledPuppet {
  trait PuppetEventListener {
    def stop(): Unit
  }
}
