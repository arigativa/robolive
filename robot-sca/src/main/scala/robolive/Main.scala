package robolive

import io.circe
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import org.freedesktop.gstreamer._
import zio.console.Console
import zio.{Ref, Task, UIO, ZIO, ZManaged, ZQueue}

sealed trait ImpureAdapter {
  protected def run[T](task: Task[T]): Unit = zio.Runtime.global.unsafeRunAsync_(task)
}

sealed trait OutputChannel[T] {
  def put(value: T): Unit
}

final class ZioQueueChannel[T](
  console: zio.console.Console.Service,
  outgoingMessages: zio.Queue[T],
) extends OutputChannel[T] with ImpureAdapter {
  override def put(value: T): Unit = run {
    outgoingMessages
      .offer(value)
      .tap { isSubmitted =>
        ZIO.when(!isSubmitted)(console.putStrLn("Can not submit message to queue"))
      }
  }
}

sealed trait KillSwitch {
  def kill(): Unit
}

final class PromiseKillSwitch(quit: zio.Promise[Nothing, Unit])
    extends KillSwitch with ImpureAdapter {
  override def kill(): Unit = run(quit.succeed(()))
}

final class AppLogic(
  outputChannel: OutputChannel[Models.Message],
  killSwitch: KillSwitch,
) extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER with Bus.EOS with Bus.ERROR {

  override def onNegotiationNeeded(elem: Element): Unit = {
    println(s"Negotiation needed: ${elem.getName}")
    val sendReceive = elem.asInstanceOf[WebRTCBin]
    sendReceive.createOffer(this)
  }

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit = {
    println(s"Ice candidate: $sdpMLineIndex $candidate")
  }

  override def onOfferCreated(offer: WebRTCSessionDescription): Unit = {
    outputChannel.put(Models.Sdp(`type` = "offer", sdp = offer.getSDPMessage.toString))
  }
  override def endOfStream(source: GstObject): Unit = killSwitch.kill()

  override def errorMessage(source: GstObject, code: Int, message: String): Unit = killSwitch.kill()
}

final class WebRTCController(
  webRTCBin: WebRTCBin,
  outgoingMessages: zio.Queue[Models.Message],
  incomingMessages: zio.Queue[Models.Message],
) {
  def process: Task[Unit] = {
    incomingMessages.take.map {
      ???
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

  def init(logic: AppLogic): ZManaged[Console, Throwable, StateChangeReturn] = {
    gstInit("robolive-robot").flatMap { implicit token =>
      for {
        pipeline <- parseDescription
        sendReceive <- getWebRTCBin(pipeline, "sendrecv")
        stateChange <- Task {
          println("BEFORE READY")
          pipeline.setState(State.READY)

          sendReceive.connect(logic: WebRTCBin.ON_NEGOTIATION_NEEDED)
          sendReceive.connect(logic: WebRTCBin.ON_ICE_CANDIDATE)
          sendReceive.createOffer(logic)

          pipeline.setState(State.PLAYING)
        }.toManaged_
      } yield {
        stateChange
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
              console <- ZIO.access[zio.console.Console](_.get[zio.console.Console.Service])
              exit <- zio.Promise.make[Nothing, Unit]
              incomingMessages <- ZQueue.unbounded[Models.Message]
              outgoingMessages <- ZQueue.unbounded[Models.Message]
              logic = {
                val killSwitch = new PromiseKillSwitch(exit)
                val outputChannel = new ZioQueueChannel[Models.Message](console, outgoingMessages)
                new AppLogic(outputChannel, killSwitch)
              }
              _ <- Application.init(logic).use { stateChange =>
                if (stateChange != StateChangeReturn.SUCCESS) {
                  zio.console
                    .putStrLn(s"Wrong pipeline state change: $stateChange")
                    .zipRight(exit.succeed(()))
                } else {
                  for {
                    // temporary measure, seems like it is the task of signalling to correctly handle messages
                    // in case client is not connected yet
                    connectionEstablished <- zio.Promise.make[Nothing, Unit]
                    _ <- ws.send(WebSocketFrame.text("ROBOT"))
                    _ <- ws.receiveText().flatMap(m => zio.console.putStrLn(s"$m")) // ROBOT_OK
                    _ <- connectionEstablished.await.zipRight {
                      outgoingMessages.take.flatMap { message =>
                        ws.send(WebSocketFrame.text(Models.Message.toWire(message)))
                      }
                    }.fork
                    _ <- ws
                      .receiveText()
                      .flatMap {
                        case Left(error) =>
                          zio.console
                            .putStrLn(s"Error: $error")
                            .zipRight(ws.close)
                            .zipRight(exit.succeed(()))
                        case Right(message) =>
                          message match {
                            case "READY" =>
                              zio.console
                                .putStrLn("Received `READY` message. Connection established.")
                                .zipRight(connectionEstablished.succeed(()))
                            case other =>
                              Models.Message.fromWire(other) match {
                                case Left(error) =>
                                  zio.console.putStr(s"Error while decoding message: $error")
                                case Right(message) =>
                                  zio.console
                                    .putStrLn(message.toString)
                                    .zipRight(incomingMessages.offer(message).unit)
                              }
                          }
                      }
                      .doUntilM(_ => exit.isDone.tap(_ => UIO(println("GStreamer teared down"))))
                  } yield ()
                }
              }
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

  sealed trait Message
  import io.circe.generic.extras.semiauto._
  import io.circe.generic.extras.Configuration

  case class Foo(fooBar: String)

  implicit val customConfig: Configuration = {
    val lowerFirstCharacter = (s: String) => s.head.toLower + s.substring(1)
    val default = Configuration.default
    default.copy(transformConstructorNames =
      default.transformConstructorNames.andThen(lowerFirstCharacter)
    )
  }

  object Message {
    import io.circe.syntax._
    import io.circe.parser._

    def toWire(message: Message): String = message.asJson.noSpaces

    def fromWire(message: String): Either[circe.Error, Message] =
      parse(message).flatMap(_.as[Message])

    implicit val encoder: Encoder[Message] = deriveConfiguredEncoder
    implicit val decoder: Decoder[Message] = deriveConfiguredDecoder
  }

  final case class Sdp(`type`: String, sdp: String) extends Message
  object Sdp {
    implicit val encoder: Encoder[Sdp] = deriveConfiguredEncoder
    implicit val decoder: Decoder[Sdp] = deriveConfiguredDecoder
  }

  final case class Ice(candidate: String, sdpMLineIndex: Int) extends Message
  object Ice {
    implicit val encoder: Encoder[Ice] = deriveConfiguredEncoder
    implicit val decoder: Decoder[Ice] = deriveConfiguredDecoder
  }
}
