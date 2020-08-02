package robolive

import org.freedesktop.gstreamer._
import org.mjsip.sip.call.ExtendedCall
import org.slf4j.LoggerFactory
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}
import sdp.SdpMessage.RawValueAttribute
import sdp.{Attributes, SdpMessage}

import scala.concurrent.{ExecutionContext, Future}

final class WebRTCController(videoSrc: String)(implicit gst: GstManaged.GSTInit.type) {
  import WebRTCController._

  private val logger = LoggerFactory.getLogger(getClass.getName)

  private var pipeline: Pipeline = _
  private var webRTCBin: WebRTCBinManaged = _
  @volatile private var state: WebRTCControllerPlayState = WebRTCControllerPlayState.Wait

  private val servoController = ServoController.make

  private def start(rtcType: Int): StateChangeReturn = synchronized {
    try {
      val pipelineDescription = WebRTCController.pipelineDescription(
        videoSrc = videoSrc,
        rtcType = rtcType,
        stunServerUrl = "stun://stun.l.google.com:19302"
      )

      pipeline = PipelineManaged(
        name = "robolive-robot-pipeline",
        description = pipelineDescription,
      )
      pipeline.ready()
      val bus = pipeline.getBus

      val eosHandler: Bus.EOS =
        (source: GstObject) => logger.info(s"EOS ${source.getName}")

      val errorHandler: Bus.ERROR = (source: GstObject, code: Int, message: String) =>
        logger.error(s"Error ${source.getName}: $code $message")

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
    } catch {
      case err: Throwable =>
        logger.error("starting failed", err)
        state = WebRTCControllerPlayState.Failure
        StateChangeReturn.FAILURE
    }
  }

  def dispose(): Unit = synchronized {
    pipeline.stop()
    pipeline.dispose()
    webRTCBin = null
    pipeline = null
    logger.debug("State transition to 'WAIT'")
    state = WebRTCControllerPlayState.Wait
  }

  private def onIncomingStream(pad: Pad): Unit = {
    if (pad.getDirection != PadDirection.SRC) {
      logger.error("Error incoming stream: pad direction incorrect")
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
      logger.error(s"Error incoming stream ${pad.getName}: pad has no caps")
    } else {
      val caps = pad.getCurrentCaps
      if (caps.size() <= 0) {
        logger.error(s"Error incoming stream ${pad.getName}: pad has no caps")
      } else {
        val structure = caps.getStructure(0)
        val name = structure.getName()
        val receiverName = "video"
        if (name.startsWith(receiverName)) {
          val queue = ElementFactory.make("queue", "incomingBuffer")
          val convert = ElementFactory.make("videoconvert", "videoconvert")
          val sink = ElementFactory.make("filesink", "filesink")
          sink.set("location", "/dev/null")
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
          logger.error(
            s"Error incoming stream ${pad.getName}: no supported $receiverName receiver, found: $name"
          )
        }
      }
    }
  }

  private def getRtpTypeForVP8Media(sdp: SdpMessage): Either[Seq[String], Int] = {
    for {
      video <- sdp.getMedia("video").toRight(Seq("Video media not found"))
      rtpMaps <- video.getAttributes[Attributes.RtpMap]("rtpmap")
      attr <- rtpMaps.find(_.encodingName == "VP8").toRight(Seq("VP8 codec not found in RtpMap"))
    } yield {
      attr.payloadType
    }
  }

  private def fixSdpForChrome(sdp: String) = {
    sdp + System.lineSeparator()
  }

  def makeCall(call: ExtendedCall, remoteSdp: SdpMessage)(
    implicit ec: ExecutionContext
  ): Future[Unit] = synchronized {
    state match {
      case WebRTCControllerPlayState.Wait | WebRTCControllerPlayState.Failure =>
        logger.info("Processing incoming call")

        getRtpTypeForVP8Media(remoteSdp) match {
          case Right(rtpType) =>
            logger.debug(s"Extracted rtpType: $rtpType")

            if (start(rtpType) == StateChangeReturn.SUCCESS) {
              logger.info("Call accepted")
              state = WebRTCControllerPlayState.Busy

              call.ring()

              webRTCBin.setRemoteOffer(remoteSdp)
              logger.debug(s"Remote offer set: ${remoteSdp.toSdpString}")
              (for {
                localIceCandidates <- webRTCBin.fetchIceCandidates()
                localIceCandidatesStr = localIceCandidates
                  .map(c => s"${c.sdpMLineIndex} | ${c.candidate}")
                  .mkString(System.lineSeparator())
                _ = logger.info(s"Ice candidates fetched: $localIceCandidatesStr")
                answer <- webRTCBin.createAnswer()
                _ = logger.info(s"Answer created: ${answer.toSdpString}")
              } yield {
                localIceCandidates.foreach { iceCandidate =>
                  webRTCBin.addIceCandidate(iceCandidate)
                }
                webRTCBin.setLocalAnswer(answer)

                val mediasWithCandidates = localIceCandidates.groupBy(_.sdpMLineIndex).map {
                  case (mIndex, candidates) =>
                    val attrs = candidates.map(c => RawValueAttribute("candidate", c.candidate))
                    answer.media(mIndex).attributesAdded(attrs)
                }

                val answerWithCandidates = answer.copy(media = mediasWithCandidates.toSeq)
                val sdpString = fixSdpForChrome(answerWithCandidates.toSdpString)

                logger.debug(s"Answer is ready:\n $sdpString")

                call.accept(sdpString)
              }).recover {
                case error =>
                  logger.error(s"Error: fail to process call ${error.getMessage}", error)

                  state = WebRTCControllerPlayState.Failure
                  logger.debug("State transition to 'FAILURE'")

                  Future.successful(call.refuse())
              }
            } else {
              logger.error("Failed to start")

              state = WebRTCControllerPlayState.Failure
              logger.debug("State transition to 'FAILURE'")

              Future.successful(call.refuse())
            }
          case Left(errors) =>
            val errorString = errors.mkString(", ")
            logger.error(s"Error: fail to extract rtpType from SDP $errorString")

            state = WebRTCControllerPlayState.Failure
            logger.debug("State transition to 'FAILURE'")

            Future.successful(call.refuse())
        }
      case WebRTCControllerPlayState.Busy =>
        logger.info("Robot is busy")
        Future.successful(call.hangup())
    }

  }

  object Keys {
    val ArrowUp = 38
    val ArrowDown = 40
    val ArrowLeft = 37
    val ArrowRight = 39
  }

  case class ServosState(servos: Map[Int, Int]) {
    def move(servoId: Int, angleDiff: Int): ServosState = {
      val result = ServosState(servos.updatedWith(servoId) {
        case None => Some(90 + angleDiff)
        case Some(angle) =>
          val newAngle = angle + angleDiff
          val limitedAngle =
            if (newAngle < 0) 0
            else if (newAngle > 180) 180
            else newAngle
          Some(limitedAngle)
      })

      servoController.servoProxy(servoId, result.servos.getOrElse(servoId, 0))

      result
    }
  }

  var servosState = ServosState(Map.empty)

  def updateServoState(f: ServosState => ServosState) = {
    servosState = f(servosState)
  }

  def clientInput(input: String): Unit = {
    import io.circe._, io.circe.generic.auto._, io.circe.parser._, io.circe.syntax._
    import Keys._

    sealed trait ClientInput
    case class KeyPressed(keyCode: Int) extends ClientInput

    decode[KeyPressed](input) match {
      case Right(KeyPressed(keyCode)) =>
        keyCode match {
          case ArrowUp => updateServoState(_.move(3, 10))
          case ArrowDown => updateServoState(_.move(3, -10))
          case ArrowLeft => updateServoState(_.move(0, 10))
          case ArrowRight => updateServoState(_.move(0, -10))
          case _ => logger.warn(s"unhandled user key press: $keyCode")
        }
      case Left(err: Throwable) =>
        logger.warn("unexpected user input: $", err)
    }

    logger.info(s"Client input received: $input")
  }
}

object WebRTCController {
  sealed trait WebRTCControllerPlayState

  object WebRTCControllerPlayState {
    case object Failure extends WebRTCControllerPlayState
    case object Wait extends WebRTCControllerPlayState
    case object Busy extends WebRTCControllerPlayState
  }

  def pipelineDescription(videoSrc: String, rtcType: Int, stunServerUrl: String): String = {
    s"""webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=$stunServerUrl
       | $videoSrc ! queue ! vp8enc deadline=1 ! rtpvp8pay pt=$rtcType !
       | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=$rtcType ! sendrecv.""".stripMargin
  }
}