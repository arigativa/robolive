package robolive

import io.circe
import org.freedesktop.gstreamer._
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSDPType, WebRTCSessionDescription}
import zio.console.Console
import zio._

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
  def kill(): UIO[Unit]
  def isKilled: UIO[Boolean]
}

final class PromiseKillSwitch(quit: zio.Promise[Nothing, Unit])
    extends KillSwitch with ImpureAdapter {
  override def kill(): UIO[Unit] = quit.succeed(()).unit
  override def isKilled: UIO[Boolean] = quit.isDone
}

final class WebRTCMessageHandler(
  outputChannel: OutputChannel[Models.InternalMessage],
) extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER with Bus.EOS with Bus.ERROR {
  import Models.InternalMessage._
  override def onNegotiationNeeded(elem: Element): Unit =
    outputChannel.put(OnNegotiationNeeded(elem, this))

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit =
    outputChannel.put(OnIceCandidate(sdpMLineIndex, candidate))

  override def onOfferCreated(offer: WebRTCSessionDescription): Unit =
    outputChannel.put(OnOfferCreated(offer))

  override def endOfStream(source: GstObject): Unit =
    outputChannel.put(EndOfStream(source))

  override def errorMessage(source: GstObject, code: Int, message: String): Unit =
    outputChannel.put(ErrorMessage(source, code, message))
}

final class WebRTCController(
  webRTCBin: WebRTCBin,
  externalIn: zio.Queue[Models.ExternalMessage],
  externalOut: zio.Queue[Models.ExternalMessage],
  internal: zio.Queue[Models.InternalMessage],
  killSwitch: KillSwitch
) {
  def process: ZIO[Console, Throwable, Unit] = {
    import Models._

    internal.take.flatMap {
      case InternalMessage.OnNegotiationNeeded(elem, handler) =>
        Task {
          println(s"onNegotiationNeeded: ${Thread.currentThread().getName}")
          println(s"Negotiation needed: ${elem.getName}")
          val sendReceive = elem.asInstanceOf[WebRTCBin]
          sendReceive.createOffer(handler)
        }
      case InternalMessage.OnIceCandidate(sdpMLineIndex, candidate) =>
        Task {
          println(s"onIceCandidate: ${Thread.currentThread().getName}")
          println(s"Ice candidate: $sdpMLineIndex $candidate")
        }
      case InternalMessage.OnOfferCreated(offer) =>
        Task {
          println(s"onOfferCreated: ${Thread.currentThread().getName}")
          offer.disown()
          val offerMessage = offer.getSDPMessage.toString
          webRTCBin.setLocalDescription(offer)
          offer.disown()
          offerMessage
        }.flatMap { offerMessage =>
          externalOut.offer(Models.ExternalMessage.Sdp(`type` = "offer", sdp = offerMessage))
        }
      case InternalMessage.EndOfStream(source) => killSwitch.kill()
      case InternalMessage.SetLocalDescription(offer) => killSwitch.kill()
      case InternalMessage.ErrorMessage(source: GstObject, code: Int, message: String) =>
        killSwitch.kill()
    }
    externalIn.take.flatMap {
      case m @ ExternalMessage.Sdp(tp, sdp) =>
        zio.console.putStrLn(s"Received: $m").map { _ =>
          val tpe = WebRTCSDPType.ANSWER
          val sdpMessage = new SDPMessage()
          sdpMessage.parseBuffer(sdp)
          val description = new WebRTCSessionDescription(tpe, sdpMessage)
          webRTCBin.setRemoteDescription(description)
        }
      case m @ ExternalMessage.Ice(candidate, sdpMLineIndex) =>
        zio.console.putStrLn(s"Received: $m").map { _ =>
          webRTCBin.addIceCandidate(sdpMLineIndex, candidate)
        }
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
      Gst.init(new Version(1, 14), name)
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
    logic: WebRTCMessageHandler
  ): ZManaged[Console, Throwable, (StateChangeReturn, WebRTCBin)] = {
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
        println(s"init: ${Thread.currentThread().getName}")
        stateChange -> sendReceive // completely bad idea, but for now OK
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
              externalIn <- ZQueue.unbounded[Models.ExternalMessage]
              externalOut <- ZQueue.unbounded[Models.ExternalMessage]
              internal <- ZQueue.unbounded[Models.InternalMessage]
              webRTCHandler <- ZIO
                .access[zio.console.Console](_.get[zio.console.Console.Service])
                .map(new ZioQueueChannel(_, internal))
                .map(new WebRTCMessageHandler(_))
              killSwitch <- zio.Promise.make[Nothing, Unit].map(new PromiseKillSwitch(_))
              _ <- Application.init(webRTCHandler).use {
                case (stateChange, bin) =>
                  if (stateChange != StateChangeReturn.SUCCESS) {
                    zio.console
                      .putStrLn(s"Wrong pipeline state change: $stateChange")
                      .zipRight(killSwitch.kill())
                  } else {
                    for {
                      // temporary measure, seems like it is the task of signalling to correctly handle messages
                      // in case client is not connected yet
                      connectionEstablished <- zio.Promise.make[Nothing, Unit]
                      _ <- new WebRTCController(bin, externalIn, externalOut, internal, killSwitch).process
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      _ <- ws.send(WebSocketFrame.text("ROBOT"))
                      _ <- ws
                        .receiveText()
                        .flatMap(m => zio.console.putStrLn(s"ASD: $m")) // ROBOT_OK
                      _ <- connectionEstablished.await.zipRight {
                        externalOut.take.flatMap { message =>
                          ws.send(WebSocketFrame.text(Models.ExternalMessage.toWire(message)))
                        }
                      }.fork
                      _ <- ws
                        .receiveText()
                        .flatMap {
                          case Left(error) =>
                            zio.console
                              .putStrLn(s"Error: $error")
                              .zipRight(ws.close)
                              .zipRight(killSwitch.kill())
                          case Right(message) =>
                            message match {
                              case "READY" =>
                                zio.console
                                  .putStrLn("Received `READY` message. Connection established.")
                                  .zipRight(connectionEstablished.succeed(()))
                              case other =>
                                Models.ExternalMessage.fromWire(other) match {
                                  case Left(error) =>
                                    zio.console.putStr(s"Error while decoding message: $error")
                                  case Right(message) =>
                                    println(s"Right($message)")
                                    externalIn
                                      .offer(message)
                                      .tap { isOffered =>
                                        if (isOffered)
                                          zio.console.putStrLn("Incoming message put in a queue")
                                        else
                                          zio.console
                                            .putStrLn("Can not put incoming message in a queue")
                                      }
                                      .unit
                                }
                            }
                        }
                        .doUntilM(_ =>
                          killSwitch.isKilled.tap { isDone =>
                            if (isDone) {
                              UIO(println("GStreamer teared down"))
                            } else {
                              UIO(())
                            }
                          }
                        )
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

  sealed trait Message
  sealed trait InternalMessage extends Message
  sealed trait ExternalMessage extends Message

  object InternalMessage {
    final case class OnNegotiationNeeded(elem: Element, handler: WebRTCBin.CREATE_OFFER)
        extends InternalMessage
    final case class OnIceCandidate(sdpMLineIndex: Int, candidate: String) extends InternalMessage
    final case class OnOfferCreated(offer: WebRTCSessionDescription) extends InternalMessage
    final case class EndOfStream(source: GstObject) extends InternalMessage
    final case class ErrorMessage(source: GstObject, code: Int, message: String)
        extends InternalMessage
    final case class SetLocalDescription(offer: String) extends InternalMessage
  }

  object ExternalMessage {

    import io.circe.generic.extras.Configuration
    import io.circe.generic.extras.semiauto._

    private implicit val customConfig: Configuration = {
      val lowerFirstCharacter = (s: String) => s.head.toLower + s.substring(1)
      val default = Configuration.default
      default.copy(transformConstructorNames =
        default.transformConstructorNames.andThen(lowerFirstCharacter)
      )
    }

    import io.circe.parser._
    import io.circe.syntax._

    def toWire(message: ExternalMessage): String = message.asJson.noSpaces

    def fromWire(message: String): Either[circe.Error, ExternalMessage] =
      parse(message).flatMap(_.as[ExternalMessage])

    implicit val encoder: Encoder[ExternalMessage] = deriveConfiguredEncoder
    implicit val decoder: Decoder[ExternalMessage] = deriveConfiguredDecoder

    final case class Sdp(`type`: String, sdp: String) extends ExternalMessage
    object Sdp {
      implicit val encoder: Encoder[Sdp] = deriveConfiguredEncoder
      implicit val decoder: Decoder[Sdp] = deriveConfiguredDecoder
    }

    final case class Ice(candidate: String, sdpMLineIndex: Int) extends ExternalMessage
    object Ice {
      implicit val encoder: Encoder[Ice] = deriveConfiguredEncoder
      implicit val decoder: Decoder[Ice] = deriveConfiguredDecoder
    }
  }
}
