package robolive

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer._
import org.mjsip.sdp.{AttributeField, SdpMessage}
import org.mjsip.sip.call.ExtendedCall
import robolive.gstreamer.WebRTCBinManaged.IceCandidate
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}

import scala.concurrent.{ExecutionContext, Future}

final class WebRTCController(webRTCBin: WebRTCBinManaged) {
  def makeCall(call: ExtendedCall, remoteSdp: SdpMessage)(
    implicit ec: ExecutionContext
  ): Future[Unit] = {
    call.ring()

    webRTCBin.setRemoteOffer(remoteSdp)
    for {
      localIceCandidates <- webRTCBin.fetchIceCandidates()
      answer <- webRTCBin.createAnswer()
    } yield {
      webRTCBin.setLocalAnswer(answer)

      localIceCandidates.foreach {
        case IceCandidate(mIdx, value) =>
          answer.getMediaDescriptors.get(mIdx).addAttribute(new AttributeField(value))
      }

      call.accept(answer.toString)
    }
  }
}

object Main extends App {

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  private val DefaultVideoSrcPipeline =
    "videotestsrc is-live=true pattern=ball ! videoconvert"
  private val DefaultAudioSrcPipeline =
    "audiotestsrc ! audioconvert ! audioresample"

  val videoSrc = getEnv("VIDEO_SRC", DefaultVideoSrcPipeline)
  val audioSrc = getEnv("AUDIO_SRC", DefaultAudioSrcPipeline)
  val latch = new CountDownLatch(1)

  implicit val gstInit: GstManaged.GSTInit.type = GstManaged("robolive-robot", new Version(1, 14))
  val pipeline = PipelineManaged(
    name = "robolive-robot-pipeline",
    description = pipelineDescription(videoSrc, audioSrc)
  )
  pipeline.ready()
  val bus = pipeline.getBus

  val eosHandler: Bus.EOS =
    (source: GstObject) => println(s"EOS OCCURRED: ${source.getName}")

  val errorHandler: Bus.ERROR = (source: GstObject, code: Int, message: String) =>
    println(s"ERROR OCCURRED: ${source.getName} $code $message")

  bus.connect(eosHandler)
  bus.connect(errorHandler)

  val stateChange = pipeline.play()
  if (stateChange != StateChangeReturn.SUCCESS) {
    new RuntimeException(s"Wrong pipeline state change: $stateChange")
  }
  val bin = WebRTCBinManaged(pipeline, "sendrecv")
  val controller = new WebRTCController(bin)
  val sipEventsHandler = new SIPCallEventHandler(controller)
  val sipClient = new SipClient(sipEventsHandler)

  latch.await()

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)

  private def pipelineDescription(videoSrc: String, audioSrc: String): String = {
    s"""webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
       | $videoSrc ! queue ! vp8enc deadline=1 ! rtpvp8pay pt=120 !
       | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=120 ! sendrecv.""".stripMargin
  }

}
