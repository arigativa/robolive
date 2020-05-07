package robolive

import org.freedesktop.gstreamer._
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSDPType, WebRTCSessionDescription}
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}
import sttp.model.Uri
import zio.console.Console
import zio._

final class WebRTCController(
  webRTCBin: WebRTCBin,
  messages: zio.Queue[Message],
  events: zio.Queue[Event],
  killSwitch: KillSwitch
) {
  private def handleInternalMessage(message: Event) = {
    message match {
      case Event.OnNegotiationNeeded(elem, handler) =>
        Task {
          val sendReceive = elem.asInstanceOf[WebRTCBin]
          sendReceive.createOffer(handler)
        }.unit
      case Event.OnIceCandidate(sdpMLineIndex, candidate) =>
        messages.offer(Message.Ice(candidate, sdpMLineIndex)).unit
      case Event.OnOfferCreated(offer) =>
        Task {
          offer.disown()
          val offerMessage = offer.getSDPMessage.toString
          webRTCBin.setLocalDescription(offer)
          offerMessage
        }.flatMap { offerMessage =>
          messages.offer(
            Message.Sdp(`type` = "offer", sdp = offerMessage)
          )
        }.unit
      case Event.EndOfStream(source) => killSwitch.kill()
      case Event.ErrorMessage(source: GstObject, code: Int, message: String) =>
        Task.unit // distinguish between fatals and non fatals?
      case Event.SdpMessageReceived(Message.Sdp(tp, sdp)) =>
        Task {
          val tpe = WebRTCSDPType.ANSWER
          val sdpMessage = new SDPMessage()
          sdpMessage.parseBuffer(sdp)
          val description = new WebRTCSessionDescription(tpe, sdpMessage)
          webRTCBin.setRemoteDescription(description)
        }.unit
      case Event.IceCandidateReceived(Message.Ice(candidate, sdpMLineIndex)) =>
        Task(webRTCBin.addIceCandidate(sdpMLineIndex, candidate))
    }
  }

  def processEvent: ZIO[Console, Throwable, Unit] = {
    events.take.tap { message =>
      zio.console.putStrLn(s"Internal: $message")
    }.flatMap(handleInternalMessage)
      .tapError(error => zio.console.putStrLn(s"Internal task error: $error"))
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
    import org.slf4j.bridge.SLF4JBridgeHandler
    SLF4JBridgeHandler.removeHandlersForRootLogger()
    SLF4JBridgeHandler.install()

    zio.system
      .env("SIGNALLING_URI")
      .flatMap { uriRaw =>
        ZIO.fromEither {
          uriRaw
            .toRight("Provide `SIGNALLING_URI` env")
            .flatMap(Uri.parse)
        }.mapError(error => new RuntimeException(error))
      }
      .flatMap { signallingUri =>
        AsyncHttpClientZioBackend
          .managed()
          .use { implicit backend =>
            basicRequest
              .get(signallingUri)
              .openWebsocketF(ZioWebSocketHandler())
              .flatMap { r =>
                val ws: WebSocket[Task] = r.result
                for {
                  messages <- ZQueue.unbounded[Message]
                  events <- ZQueue.unbounded[Event]
                  webRTCHandler <- ZIO
                    .access[zio.console.Console](_.get[zio.console.Console.Service])
                    .map(new ImpureWorldAdapter.ZioQueueChannel(_, events))
                    .map(new WebRTCEventsHandler(_))
                  killSwitch <- zio.Promise
                    .make[Nothing, Unit]
                    .map(new KillSwitch.PromiseKillSwitch(_))
                  _ <- init(webRTCHandler).use { bin =>
                    for {
                      connectionEstablished <- zio.Promise.make[Nothing, Unit]
                      _ <- establishConnection(ws, connectionEstablished)
                        .doUntilM(_ => connectionEstablished.isDone)
                      _ <- sendChannel(messages, connectionEstablished, ws)
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      _ <- receiveChannel(ws, events)
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      // .process not working if moved upper, need to figure out why
                      _ <- new WebRTCController(bin, messages, events, killSwitch).processEvent
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      _ <- killSwitch.await.tap(_ => UIO(println("GStreamer teared down")))
                    } yield ()
                  }
                } yield ()
              }
          }
      }
      .fold(error => {
        println(error)
        1
      }, _ => 0)
  }

  private def establishConnection(
    ws: WebSocket[Task],
    connectionEstablished: zio.Promise[Nothing, Unit],
  ) = {
    for {
      _ <- ws.send(WebSocketFrame.text("ROBOT"))
      _ <- ws
        .receiveText()
        .flatMap(m => zio.console.putStrLn(s"ASD: $m")) // ROBOT_OK
      _ <- ws
        .receiveText()
        .flatMap {
          case Right(message) =>
            if (message == "READY")
              zio.console
                .putStrLn("Received `READY` message. Connection established.")
                .zipRight(connectionEstablished.succeed(()))
            else
              zio.console
                .putStrLn(s"Received `$message`. Waiting for `READY` message")
          case Left(error) =>
            zio.console
              .putStrLn(s"Error receiving message: $error")
              .zipRight(ws.close)
        }
    } yield ()
  }

  private def receiveChannel(
    ws: WebSocket[Task],
    events: Queue[Event],
  ) = {
    ws.receiveText().flatMap {
      case Left(error) =>
        zio.console
          .putStrLn(s"Error receiving message: $error")
          .zipRight(ws.close)
      case Right(message) =>
        Message.fromWire(message) match {
          case Left(error) => zio.console.putStr(s"Error while decoding message: $error")
          case Right(message) =>
            val internalEvent = message match {
              case m: Message.Sdp => Event.SdpMessageReceived(m)
              case m: Message.Ice => Event.IceCandidateReceived(m)
            }
            events
              .offer(internalEvent)
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
  private def sendChannel(
    messages: Queue[Message],
    canSend: zio.Promise[Nothing, Unit],
    ws: WebSocket[Task],
  ): ZIO[Console, Throwable, Unit] = {
    messages.take
      .tap(message => zio.console.putStrLn(s"Sending: $message"))
      .flatMap { message =>
        canSend.await
          .zipRight(
            ws.send(WebSocketFrame.text(Message.toWire(message)))
          )
          .catchAll { error =>
            zio.console.putStrLn(s"error sending message: $error")
          }
      }
  }

  private val PipelineDescription =
    """webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
      | autovideosrc is-live=true pattern=ball ! videoconvert ! queue ! vp8enc deadline=1 ! rtpvp8pay !
      | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
      | audiotestsrc ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
      | queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.""".stripMargin

  private def init(
    webRTCEventsHandler: WebRTCEventsHandler
  ): ZManaged[Console, Throwable, WebRTCBin] = {
    GstManaged("robolive-robot", new Version(1, 14)).flatMap { implicit token =>
      for {
        pipeline <- PipelineManaged("robolive-robot-pipeline", PipelineDescription)
        sendReceive <- WebRTCBinManaged(pipeline, "sendrecv")
        stateChange <- Task {
          import WebRTCBinManaged.WebRTCBinOps
          println("BEFORE READY")
          pipeline.setState(State.READY)

          sendReceive.connect(webRTCEventsHandler: WebRTCBin.ON_NEGOTIATION_NEEDED)
          sendReceive.connect(webRTCEventsHandler: WebRTCBin.ON_ICE_CANDIDATE)
          val bus = pipeline.getBus
          bus.connect(webRTCEventsHandler: Bus.EOS)
          bus.connect(webRTCEventsHandler: Bus.ERROR)

          val channel = sendReceive.createDataChannel("server-channel")
          println(s"CHANNEL CREATED: ${channel.getName}")
          println(s"CHANNEL CREATED: ${channel.getTypeName}")
          channel.connect { (message: String) =>
            println(s"MESSAGE RECEIVED: $message")
          }

          pipeline.setState(State.PLAYING)
        }.toManaged_
        _ <- ZManaged.when(stateChange != StateChangeReturn.SUCCESS)(
          ZIO.fail(new RuntimeException(s"Wrong pipeline state change: $stateChange")).toManaged_
        )
      } yield {
        sendReceive
      }
    }
  }
}
