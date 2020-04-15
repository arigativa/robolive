package robolive
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import org.freedesktop.gstreamer._
import sttp.client.ws.{WebSocket, WebSocketEvent}
import sttp.model.ws.WebSocketFrame
import zio.console.Console
import zio.{Task, UIO, ZIO, ZManaged}

final class AppLogic(ws: WebSocket[Task])
    extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER {
  override def onNegotiationNeeded(elem: Element): Unit = {
    println(s"Negotiation needed: ${elem.getName}")
    val sendReceive = elem.asInstanceOf[WebRTCBin]
    sendReceive.createOffer(this)
  }

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit = {
    println(s"Ice candidate: $sdpMLineIndex $candidate")
  }
  override def onOfferCreated(offer: WebRTCSessionDescription): Unit = {
    zio.Runtime.global.unsafeRun {
      ws.send(
        WebSocketFrame
          .text(
            s"""{"sdp": {"type": "offer", "sdp": ${offer.getSDPMessage.toString}}}""".stripMargin
          ),
      )
    }
  }
}

object Application {
  private val PipelineDescription =
    """webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
      | videotestsrc is-live=true pattern=ball ! videoconvert ! queue ! vp8enc deadline=1 ! rtpvp8pay !
      | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
      | audiotestsrc is-live=true wave=red-noise ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
      | queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.""".stripMargin

  case object GSTInit

  def gstInit(name: String): ZManaged[Any, Throwable, GSTInit.type] =
    ZManaged.make(Task {
      Gst.init(name, "--gst-disable-segtrap")
      GSTInit
    })(_ => UIO(Gst.deinit()))

  def parseDescription(implicit ev: GSTInit.type): ZManaged[Console, Throwable, Pipeline] =
    ZManaged.make(Task {
      val process = Gst.parseBinFromDescription(PipelineDescription, false)
      val pipeline = new Pipeline("robolive-robot-pipeline")
      val added = pipeline.add(process)
      assert(added, "Can not add bin to pipeline")
      pipeline
    })(pipeline =>
      UIO {
        pipeline.setState(State.NULL)
        pipeline.dispose()
      }
    )

  def getWebRTCBin(pipeline: Pipeline, name: String)(
    implicit ev: GSTInit.type
  ): ZManaged[Console, Throwable, WebRTCBin] =
    ZManaged.make(Task {
      val sendrcv = pipeline.getElementByName(name).asInstanceOf[WebRTCBin]
      assert(sendrcv != null, "Can not find sendrecv")
      sendrcv
    })(webrtc => UIO(webrtc.dispose()))

  def init(ws: WebSocket[Task]): ZManaged[Console, Throwable, StateChangeReturn] = {
    gstInit("robolive-robot").flatMap { implicit token =>
      for {
        pipeline <- parseDescription
        sendReceive <- getWebRTCBin(pipeline, "sendrecv")
      } yield {
        println("BEFORE READY")
        pipeline.setState(State.READY)

        val logic = new AppLogic(ws)
        sendReceive.connect(logic: WebRTCBin.ON_NEGOTIATION_NEEDED)
        sendReceive.connect(logic: WebRTCBin.ON_ICE_CANDIDATE)
        sendReceive.createOffer(logic)

        pipeline.setState(State.PLAYING)
      }
    }
  }
}

// https://sttp.softwaremill.com/en/latest/websockets.html
// https://sttp.softwaremill.com/en/latest/backends/zio.html
object Main extends zio.App {
  import sttp.client._
  import sttp.client.asynchttpclient.zio.{AsyncHttpClientZioBackend, ZioWebSocketHandler}
  import sttp.client.ws.WebSocket
  import sttp.model.ws.WebSocketFrame
  import zio.Task

  def handleMessage(
    message: Either[WebSocketEvent, String],
    ws: WebSocket[Task]
  ): ZIO[Console, Throwable, Unit] = {
    println(s"RECEIVED: $message")
    message match {
      case Right("READY") =>
        Application.init(ws).use {
          case StateChangeReturn.SUCCESS =>
            UIO(Thread.sleep(60000))
          case other =>
            zio.console
              .putStr(other.toString)
              .flatMap(_ => UIO(Thread.sleep(60000)))
        }
      case Right(message) => UIO(println(message))
      case Left(event) => ws.close
    }
  }

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
              _ <- ws.receiveText().flatMap(handleMessage(_, ws)).forever
            } yield ()
          }
      }
      .fold(error => {
        println(error)
        1
      }, _ => 0)
  }
}
