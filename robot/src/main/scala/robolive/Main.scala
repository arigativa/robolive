package robolive

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer._
import org.mjsip.sdp.{AttributeField, SdpMessage}
import org.mjsip.sip.call.ExtendedCall
import robolive.gstreamer.WebRTCBinManaged.IceCandidate
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}

import scala.concurrent.{ExecutionContext, Future}

sealed trait WebRTCControllerPlayState

object WebRTCControllerPlayState {
  case object Failure extends WebRTCControllerPlayState
  case object Wait extends WebRTCControllerPlayState
  case object Busy extends WebRTCControllerPlayState
}

final class WebRTCController(pipelineDescription: String)(implicit gst: GstManaged.GSTInit.type) {
  private var pipeline: Pipeline = _
  private var webRTCBin: WebRTCBinManaged = _
  @volatile private var state: WebRTCControllerPlayState = WebRTCControllerPlayState.Wait

  private def start(): StateChangeReturn = synchronized {
    pipeline = PipelineManaged(
      name = "robolive-robot-pipeline",
      description = pipelineDescription,
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
    if (stateChange == StateChangeReturn.SUCCESS) {
      webRTCBin = WebRTCBinManaged(pipeline, "sendrecv")
      webRTCBin.onPadAdded(onIncomingStream)
    } else {
      pipeline = null
      webRTCBin = null
    }
    stateChange
  }

  def dispose(): Unit = synchronized {
    pipeline.stop()
    pipeline.dispose()
    webRTCBin = null
    pipeline = null
    println("STATE: WAIT")
    state = WebRTCControllerPlayState.Wait
  }

  private def onIncomingStream(pad: Pad): Unit = {
    if (pad.getDirection != PadDirection.SRC) {
      println("Pad direction incorrect")
    } else {
      val decodebin = ElementFactory.make("decodebin", "inDecodeBin")
      decodebin.connect(new Element.PAD_ADDED {
        override def padAdded(
          element: Element,
          pad: Pad
        ): Unit = onIncomingDecodebinStream(pad)
      })
      pipeline.add(decodebin)
      decodebin.syncStateWithParent()
      webRTCBin.link(decodebin)
    }
  }

  private def onIncomingDecodebinStream(pad: Pad) = {
    if (!pad.hasCurrentCaps) {
      println(s"Pad ${pad.getName} has no caps")
    } else {
      val caps = pad.getCurrentCaps
      if (caps.size() <= 0) {
        println("Caps size is 0")
      } else {
        val structure = caps.getStructure(0)
        val name = structure.getName()
        if (name.startsWith("video")) {
          val queue = ElementFactory.make("queue", "incomingBuffer")
          val convert = ElementFactory.make("videoconvert", "videoconvert")
          val sink = ElementFactory.make("autovideosink", "autovideosink")
          pipeline.add(queue)
          pipeline.add(convert)
          pipeline.add(sink)
          queue.syncStateWithParent()
          convert.syncStateWithParent()
          sink.syncStateWithParent()
          pad.link(queue.getStaticPad("sink"))
          queue.link(convert)
          convert.link(sink)
        } else {
          println("No supported receiver")
        }
      }
    }
  }

  def makeCall(call: ExtendedCall, remoteSdp: SdpMessage)(
    implicit ec: ExecutionContext
  ): Future[Unit] = synchronized {
    state match {
      case WebRTCControllerPlayState.Wait | WebRTCControllerPlayState.Failure =>
        println("STATE: WAIT | FAILURE STATE")
        if (start() == StateChangeReturn.SUCCESS) {
          state = WebRTCControllerPlayState.Busy

          call.ring()

          webRTCBin.setRemoteOffer(remoteSdp)
          (for {
            localIceCandidates <- webRTCBin.fetchIceCandidates()
            answer <- webRTCBin.createAnswer()
          } yield {
            webRTCBin.setLocalAnswer(answer)

            localIceCandidates.foreach {
              case IceCandidate(mIdx, value) =>
                answer.getMediaDescriptors.get(mIdx).addAttribute(new AttributeField(value))
            }

            println(s"ANSWER PREPARED:\n $answer")

            call.accept(answer.toString)
          }).recover {
            case error =>
              error.printStackTrace()
              state = WebRTCControllerPlayState.Failure
              Future.successful(call.refuse())
          }
        } else {
          state = WebRTCControllerPlayState.Failure
          println("STATE: FAILED TO START")
          Future.successful(call.refuse())
        }

      case WebRTCControllerPlayState.Busy =>
        println("STATE: BUSY")
        Future.successful(call.hangup())
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
  val pipelineDesc = pipelineDescription(videoSrc, audioSrc)

  implicit val gstInit: GstManaged.GSTInit.type = GstManaged("robolive-robot", new Version(1, 14))

  val controller = new WebRTCController(pipelineDesc)
  val sipEventsHandler = new SIPCallEventHandler(controller)
  val sipConfig = SipConfig(
    registrarUri = "localhost:9031",
//    registrarUri = "rl.arigativa.ru:9031",
    name = "robomachine",
    protocol = "tcp",
  )
  val sipClient = new SipClient(sipEventsHandler, sipConfig)

  latch.await()

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)

  private def rtppt = 120

  private def pipelineDescription(videoSrc: String, audioSrc: String): String = {
    s"""webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
       | $videoSrc ! queue ! vp8enc deadline=1 ! rtpvp8pay pt=${rtppt} !
       | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=${rtppt} ! sendrecv.""".stripMargin
  }

}
