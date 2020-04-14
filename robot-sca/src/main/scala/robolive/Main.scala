package robolive
import org.freedesktop.gstreamer.{Element, ElementFactory, Gst, Pipeline, State}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import zio.{UIO, ZIO}

final class AppLogic
    extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER {
  override def onNegotiationNeeded(elem: Element): Unit = {
    println(s"Negotiation needed: ${elem.getName}")
  }

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit = {
    println(s"Ice candidate: $sdpMLineIndex $candidate")
  }
  override def onOfferCreated(offer: WebRTCSessionDescription): Unit = {
    println(offer.getSDPMessage.toString)
  }
}

object Main extends App {
  private val PipelineDescription =
    """webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
      | videotestsrc is-live=true pattern=ball ! videoconvert ! queue ! vp8enc deadline=1 ! rtpvp8pay !
      | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
      | audiotestsrc is-live=true wave=red-noise ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
      | queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.""".stripMargin

  Gst.init("robolive-robot")

  val process = Gst.parseBinFromDescription(PipelineDescription, false)

  val pipeline = new Pipeline("robolive-robot-pipeline")
  val added = pipeline.add(process)
  assert(added, "Can not add bin to pipeline")

  val sendrcv = pipeline.getElementByName("sendrecv").asInstanceOf[WebRTCBin]
  assert(sendrcv != null, "Can not find sendrecv")
  println("BEFORE READY")
  pipeline.setState(State.READY)

  val logic = new AppLogic
  sendrcv.connect(logic: WebRTCBin.ON_NEGOTIATION_NEEDED)
  sendrcv.connect(logic: WebRTCBin.ON_ICE_CANDIDATE)
  sendrcv.createOffer(logic)

  println("BEFORE PLAYING")
  pipeline.setState(State.PLAYING)

  Thread.sleep(10000)
}

// https://sttp.softwaremill.com/en/latest/websockets.html
// https://sttp.softwaremill.com/en/latest/backends/zio.html
object Ws extends zio.App {
  import sttp.client._
  import sttp.client.ws.{WebSocket, WebSocketResponse}
  import sttp.model.ws.WebSocketFrame
  import sttp.client.asynchttpclient.zio.ZioWebSocketHandler
  import sttp.client.asynchttpclient.WebSocketHandler
  import sttp.client.asynchttpclient.zio.AsyncHttpClientZioBackend
  import zio.Task

  override def run(args: List[String]): ZIO[zio.ZEnv, Nothing, Int] = {
    AsyncHttpClientZioBackend
      .managed()
      .use { implicit backend =>
        basicRequest
          .get(uri"ws://localhost:5000")
          .openWebsocketF(ZioWebSocketHandler())
          .flatMap { r =>
            val ws: WebSocket[Task] = r.result
            for {
              _ <- ws.send(WebSocketFrame.text("ROBOT"))
              response <- ws.receiveText().tap(r => UIO(println(s"RECEIVED: $r"))).forever
              _ <- ws.close
            } yield ()
          }
      }
      .fold(_ => 1, _ => 0)
  }
}
