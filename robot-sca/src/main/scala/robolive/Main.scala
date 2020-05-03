package robolive

import org.freedesktop.gstreamer._
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSDPType, WebRTCSessionDescription}
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}
import zio.console.Console
import zio._

final class WebRTCController(
  webRTCBin: WebRTCBin,
  externalIn: zio.Queue[Models.ExternalMessage],
  externalOut: zio.Queue[Models.ExternalMessage],
  internal: zio.Queue[Models.InternalMessage],
  killSwitch: KillSwitch
) {
  def process: ZIO[Console, Throwable, Unit] = {
    import Models._

    val internalProcessingTask = internal.take.tap { message =>
      zio.console.putStrLn(s"Internal: $message")
    }.flatMap {
      case InternalMessage.OnNegotiationNeeded(elem, handler) =>
        Task {
          val sendReceive = elem.asInstanceOf[WebRTCBin]
          sendReceive.createOffer(handler)
        }.unit
      case InternalMessage.OnIceCandidate(sdpMLineIndex, candidate) =>
        externalOut.offer(ExternalMessage.Ice(candidate, sdpMLineIndex))
      case InternalMessage.OnOfferCreated(offer) =>
        Task {
          offer.disown()
          val offerMessage = offer.getSDPMessage.toString
          webRTCBin.setLocalDescription(offer)
          offerMessage
        }.flatMap { offerMessage =>
          externalOut.offer(Models.ExternalMessage.Sdp(`type` = "offer", sdp = offerMessage))
        }.unit
      case InternalMessage.EndOfStream(source) => killSwitch.kill()
      case InternalMessage.ErrorMessage(source: GstObject, code: Int, message: String) =>
        Task.unit // distinguish between fatals and non fatals?
    }
    val externalProcessingTask = externalIn.take.tap { message =>
      zio.console.putStrLn(s"External: $message")
    }.flatMap {
      case ExternalMessage.Sdp(tp, sdp) =>
        Task {
          val tpe = WebRTCSDPType.ANSWER
          val sdpMessage = new SDPMessage()
          sdpMessage.parseBuffer(sdp)
          val description = new WebRTCSessionDescription(tpe, sdpMessage)
          webRTCBin.setRemoteDescription(description)
        }.unit
      case ExternalMessage.Ice(candidate, sdpMLineIndex) =>
        Task(webRTCBin.addIceCandidate(sdpMLineIndex, candidate))
    }
    internalProcessingTask
      .tapError(error => zio.console.putStrLn(s"Internal task error: $error"))
      .doUntilM(_ => killSwitch.isKilled)
      .fork
      .zipRight {
        externalProcessingTask
          .tapError(error => zio.console.putStrLn(s"External task error: $error"))
          .doUntilM(_ => killSwitch.isKilled)
          .fork
      }
      .unit
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
                .map(new ImpureWorldAdapter.ZioQueueChannel(_, internal))
                .map(new WebRTCMessageHandler(_))
              killSwitch <- zio.Promise.make[Nothing, Unit].map(new KillSwitch.PromiseKillSwitch(_))
              _ <- init(webRTCHandler).use { bin =>
                for {
                  connectionEstablished <- zio.Promise.make[Nothing, Unit]
                  _ <- establishConnection(ws, connectionEstablished)
                    .doUntilM(_ => connectionEstablished.isDone)
                  _ <- sendChannel(externalOut, connectionEstablished, ws)
                    .doUntilM(_ => killSwitch.isKilled)
                    .fork
                  _ <- receiveChannel(ws, externalIn)
                    .doUntilM(_ => killSwitch.isKilled)
                    .fork
                  // .process not working if moved upper, need to figure out why
                  _ <- new WebRTCController(bin, externalIn, externalOut, internal, killSwitch).process
                    .doUntilM(_ => killSwitch.isKilled)
                    .fork
                  _ <- killSwitch.await.tap(_ => UIO(println("GStreamer teared down")))
                } yield ()
              }
            } yield ()
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
    externalIn: Queue[Models.ExternalMessage],
  ) = {
    ws.receiveText().flatMap {
      case Left(error) =>
        zio.console
          .putStrLn(s"Error receiving message: $error")
          .zipRight(ws.close)
      case Right(message) =>
        Models.ExternalMessage.fromWire(message) match {
          case Left(error) => zio.console.putStr(s"Error while decoding message: $error")
          case Right(message) =>
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
  private def sendChannel(
    externalOut: Queue[Models.ExternalMessage],
    canSend: zio.Promise[Nothing, Unit],
    ws: WebSocket[Task],
  ): ZIO[Console, Throwable, Unit] = {
    externalOut.take
      .tap(message => zio.console.putStrLn(s"Sending: $message"))
      .flatMap { message =>
        canSend.await
          .zipRight(
            ws.send(WebSocketFrame.text(Models.ExternalMessage.toWire(message)))
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
      | autoaudiosrc ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
      | queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.""".stripMargin

  private def init(
    logic: WebRTCMessageHandler
  ): ZManaged[Console, Throwable, WebRTCBin] = {
    GstManaged("robolive-robot", new Version(1, 14)).flatMap { implicit token =>
      for {
        pipeline <- PipelineManaged("robolive-robot-pipeline", PipelineDescription)
        sendReceive <- WebRTCBinManaged(pipeline, "sendrecv")
        stateChange <- Task {
          import WebRTCBinManaged.WebRTCBinOps
          println("BEFORE READY")
          pipeline.setState(State.READY)

          sendReceive.connect(logic: WebRTCBin.ON_NEGOTIATION_NEEDED)
          sendReceive.connect(logic: WebRTCBin.ON_ICE_CANDIDATE)
          val bus = pipeline.getBus
          bus.connect(logic: Bus.EOS)
          bus.connect(logic: Bus.ERROR)

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
