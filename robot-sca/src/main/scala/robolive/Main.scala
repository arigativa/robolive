package robolive

import io.circe
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import org.freedesktop.gstreamer._
import zio.console.Console
import zio.{Ref, Task, UIO, ZIO, ZManaged, ZQueue}

final class AppLogic(
  incomingMessages: zio.Queue[Models.Message],
  outgoingMessages: zio.Queue[Models.Message],
  quit: zio.Promise[Nothing, Unit],
) extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER with Bus.EOS with Bus.ERROR {

  private def run[T](task: Task[T]) = zio.Runtime.global.unsafeRunAsync_(task)

  override def onNegotiationNeeded(elem: Element): Unit = {
    println(s"Negotiation needed: ${elem.getName}")
    val sendReceive = elem.asInstanceOf[WebRTCBin]
    sendReceive.createOffer(this)
  }

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit = {
    println(s"Ice candidate: $sdpMLineIndex $candidate")
  }

  override def onOfferCreated(offer: WebRTCSessionDescription): Unit = {
    run {
      outgoingMessages.offer(Models.Sdp(`type` = "offer", sdp = offer.getSDPMessage.toString))
    }
  }
  override def endOfStream(source: GstObject): Unit = run {
    quit.succeed(())
  }

  override def errorMessage(source: GstObject, code: Int, message: String): Unit = run {
    quit.succeed(())
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
      Gst.init(name)
      Gst.setSegTrap(false)
      GSTInit
    })(_ =>
      UIO {
        Gst.deinit()
        Gst.quit()
      }
    )

  def parseDescription(implicit ev: GSTInit.type): ZManaged[Console, Throwable, Pipeline] =
    ZManaged.make(Task {
      val process = Gst.parseBinFromDescription(PipelineDescription, false)
      val pipeline = new Pipeline("robolive-robot-pipeline")
      val added = pipeline.add(process)
      assert(added, "Can not add bin to pipeline")
      pipeline
    })(pipeline =>
      UIO {
        pipeline.stop()
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

  def init(
    incomingMessages: zio.Queue[Models.Message],
    outgoingMessages: zio.Queue[Models.Message]
  ): ZManaged[Console, Throwable, zio.Promise[Nothing, Unit]] = {
    gstInit("robolive-robot").flatMap { implicit token =>
      for {
        quit <- zio.Promise.make[Nothing, Unit].toManaged_
        pipeline <- parseDescription
        sendReceive <- getWebRTCBin(pipeline, "sendrecv")
        stateChange <- Task {
          println("BEFORE READY")
          pipeline.setState(State.READY)

          val logic = new AppLogic(incomingMessages, outgoingMessages, quit)
          sendReceive.connect(logic: WebRTCBin.ON_NEGOTIATION_NEEDED)
          sendReceive.connect(logic: WebRTCBin.ON_ICE_CANDIDATE)
          sendReceive.createOffer(logic)

          pipeline.setState(State.PLAYING)
        }.toManaged_
        _ <- ZIO
          .when(stateChange != StateChangeReturn.SUCCESS) {
            zio.console
              .putStrLn(s"Wrong pipeline state change: $stateChange")
              .zipRight(quit.succeed(()))
          }
          .toManaged_
      } yield {
        quit
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
              incomingMessages <- ZQueue.unbounded[Models.Message]
              outgoingMessages <- ZQueue.unbounded[Models.Message]
              _ <- ws.send(WebSocketFrame.text("ROBOT"))
              _ <- ws.receiveText().flatMap(m => zio.console.putStrLn(s"$m"))
              _ <- ws.receiveText().flatMap(m => zio.console.putStrLn(s"$m"))
              _ <- ws
                .receiveText()
                .flatMap {
                  case Left(error) =>
                    zio.console.putStrLn(s"Error: $error").zipRight(ws.close)
                  case Right(message) =>
                    if (message != "READY") {
                      Models.Message.fromWire(message) match {
                        case Left(error) =>
                          zio.console.putStr(s"Error while decoding message: $error")
                        case Right(message) => incomingMessages.offer(message).map(_ => ())
                      }
                    } else {
                      zio.console.putStrLn("ANOTHER READY MESSAGE") // TODO: browser sends read message each time when it tries to connect
                    }
                }
                .forever
                .fork
              _ <- outgoingMessages.take.flatMap { message =>
                ws.send(WebSocketFrame.text(Models.Message.toWire(message)))
              }.fork
              _ <- Application.init(incomingMessages, outgoingMessages).use(_.await)
            } yield ()
          }
      }
      .fold(error => {
        println(error)
        1
      }, _ => 0)
  }
}

object Models {
  import io.circe.{Decoder, Encoder}
  import io.circe.generic.semiauto._

  sealed trait Message // TODO: lowercase discriminator
  object Message {
    import io.circe.syntax._
    import io.circe.parser._

    def toWire(message: Message): String = message.asJson.noSpaces

    def fromWire(message: String): Either[circe.Error, Message] =
      parse(message).flatMap(_.as[Message])

    implicit val encoder: Encoder[Message] = deriveEncoder
    implicit val decoder: Decoder[Message] = deriveDecoder
  }

  final case class Sdp(`type`: String, sdp: String) extends Message
  object Sdp {
    implicit val encoder: Encoder[Sdp] = deriveEncoder
    implicit val decoder: Decoder[Sdp] = deriveDecoder
  }

  final case class Ice(candidate: String, sdpMLineIndex: Int) extends Message
  object Ice {
    implicit val encoder: Encoder[Ice] = deriveEncoder
    implicit val decoder: Decoder[Ice] = deriveDecoder
  }
}
