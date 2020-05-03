package robolive

import org.freedesktop.gstreamer._
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSDPType, WebRTCSessionDescription}
import robolive.bindings.GstWebRTCDataChannel
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
        Task.unit // distinguis between fatals and non fatals?
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

object Application {
  private val PipelineDescription =
    """webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
      | autovideosrc is-live=true pattern=ball ! videoconvert ! queue ! vp8enc deadline=1 ! rtpvp8pay !
      | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
      | autoaudiosrc ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
      | queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.""".stripMargin

  implicit final class WebRTCBinOps(webRTCBin: WebRTCBin) {
    def createDataChannel(name: String): GstWebRTCDataChannel = {
      webRTCBin.emit(classOf[GstWebRTCDataChannel], "create-data-channel", name, null)
    }
  }

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
          import org.slf4j.bridge.SLF4JBridgeHandler
          SLF4JBridgeHandler.removeHandlersForRootLogger()
          SLF4JBridgeHandler.install()

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
          println(channel)

          pipeline.setState(State.PLAYING)
        }.toManaged_
      } yield {
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
                .map(new ImpureWorldAdapter.ZioQueueChannel(_, internal))
                .map(new WebRTCMessageHandler(_))
              killSwitch <- zio.Promise.make[Nothing, Unit].map(new KillSwitch.PromiseKillSwitch(_))
              _ <- Application.init(webRTCHandler).use {
                case (stateChange, bin) =>
                  if (stateChange != StateChangeReturn.SUCCESS) {
                    zio.console
                      .putStrLn(s"Wrong pipeline state change: $stateChange")
                      .zipRight(killSwitch.kill())
                  } else {
                    for {
                      connectionEstablished <- zio.Promise.make[Nothing, Unit]
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
                              .putStrLn(s"Error: $error")
                              .zipRight(ws.close)
                              .zipRight(killSwitch.kill())
                        }
                        .doUntilM(_ =>
                          connectionEstablished.isDone
                            .tap(_ => UIO(println("FINISH WAITING FOR CONN")))
                        )
                      _ <- sendChannel(externalOut, connectionEstablished, ws)
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      _ <- receiveChannel(ws, externalIn, killSwitch)
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      // .process not working if moved upper, need to figure out why
                      _ <- new WebRTCController(bin, externalIn, externalOut, internal, killSwitch).process
                        .doUntilM(_ => killSwitch.isKilled)
                        .fork
                      _ <- killSwitch.await.tap(_ => UIO(println("GStreamer teared down")))
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

  private def receiveChannel(
    ws: WebSocket[Task],
    externalIn: Queue[Models.ExternalMessage],
    killSwitch: KillSwitch,
  ) = {
    ws.receiveText().flatMap {
      case Left(error) =>
        zio.console
          .putStrLn(s"Error: $error")
          .zipRight(ws.close)
          .zipRight(killSwitch.kill())
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
    ws: WebSocket[Task]
  ): ZIO[Console, Throwable, Unit] = {
    externalOut.take
      .tap(message => zio.console.putStrLn(s"Sending: $message"))
      .flatMap { message =>
        canSend.await.zipRight(
          ws.send(WebSocketFrame.text(Models.ExternalMessage.toWire(message)))
        )
      }
  }
}
