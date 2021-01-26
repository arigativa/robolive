package robolive.puppet

import org.freedesktop.gstreamer._
import org.mjsip.sip.call.ExtendedCall
import org.slf4j.LoggerFactory
import robolive.gstreamer.WebRTCBinManaged.IceCandidate
import robolive.gstreamer.{GstManaged, PipelineManaged, WebRTCBinManaged}
import sdp.SdpMessage.RawValueAttribute
import sdp.{Attributes, SdpMessage}

import scala.concurrent.{ExecutionContext, Future}

final class WebRTCController(
  videoSrc: String,
  stunServerUrl: String,
  servoController: ServoController,
  enableUserVideo: Boolean,
)(implicit gst: GstManaged.GSTInit.type) {
  import WebRTCController._

  private val logger = LoggerFactory.getLogger(getClass.getName)

  private var pipeline: Pipeline = _
  private var webRTCBin: WebRTCBinManaged = _
  @volatile private var state: WebRTCControllerPlayState = WebRTCControllerPlayState.Wait

  private def start(rtcType: Int): StateChangeReturn = synchronized {
    try {
      val pipelineDescription = WebRTCController.pipelineDescription(
        videoSrc = videoSrc,
        rtcType = rtcType,
        stunServerUrl = stunServerUrl,
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
    if (pipeline != null) {
      pipeline.stop()
      pipeline.dispose()
    }
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
    logger.info(s"onIncomingDecodebinStream(${pad.getName})")
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
          val sink = {
            if (enableUserVideo) {
              ElementFactory.make("autovideosink", "autovideosink")
            } else {
              val sink = ElementFactory.make("filesink", "filesink")
              sink.set("location", "/dev/null")
              sink
            }
          }
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
    sdp + System
      .lineSeparator() // probably should be just "\n", because it shouldn't depend on the system where robot is run
  }

  def answerCall(call: ExtendedCall, remoteSdp: SdpMessage)(
    implicit ec: ExecutionContext
  ): Future[Unit] = synchronized {
    state match {
      case WebRTCControllerPlayState.Wait | WebRTCControllerPlayState.Failure =>
        logger.info("Processing incoming call")

          case Right(rtpType) =>
            logger.debug(s"Extracted rtpType: $rtpType")

            if (start(rtpType) == StateChangeReturn.SUCCESS) {
              logger.info("Call accepted")
              logger.info(
                s"""offer:
                   |${remoteSdp.toSdpString}""".stripMargin
              )

              state = WebRTCControllerPlayState.Busy

              call.ring()

              webRTCBin.setRemoteOffer(remoteSdp)
              (for {
                localIceCandidates <- webRTCBin.fetchIceCandidates()
                localIceCandidatesStr = localIceCandidates
                  .map(c => s"${c.sdpMLineIndex} | ${c.candidate}")
                  .mkString(System.lineSeparator())
                _ = logger.debug(s"Ice candidates fetched: $localIceCandidatesStr")
                answer <- webRTCBin.createAnswer()
                _ = logger.debug(s"Answer created: ${answer.toSdpString}")
              } yield {
                remoteSdp.media.zipWithIndex.foreach {
                  case (media, i) =>
                    val candidates = media.getRawAttributes("candidate")
                    candidates.foreach { candidate =>
                      logger.info(s"ice added: `$candidate`")
                      webRTCBin.addIceCandidate(IceCandidate(i, candidate.valueOpt.get))
                    }
                }

                webRTCBin.setLocalAnswer(answer)

                val mediasWithCandidates = localIceCandidates.groupBy(_.sdpMLineIndex).map {
                  case (mIndex, candidates) =>
                    val attrs = candidates
                      .map(c => RawValueAttribute("candidate", c.candidate))
                    answer.media(mIndex).attributesAdded(attrs)
                }

                val answerWithCandidates = answer.copy(media = mediasWithCandidates.toSeq)
                val sdpString = fixSdpForChrome(answerWithCandidates.toSdpString)

                logger.info(
                  s"""answer
                     |$sdpString""".stripMargin
                )

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

    def set(servoId: Int, angle: Int): ServosState = {
      val result = servos.updated(servoId, angle)
      servoController.servoProxy(servoId, angle)
      this.copy(servos = result)
    }
  }

  var servosState = ServosState(Map.empty)

  def updateServoState(f: ServosState => ServosState) = {
    servosState = f(servosState)
  }

  def clientInput(input: String): Unit = {
    import io.circe.generic.auto._
    import io.circe.parser._

    sealed trait ClientInput
    final case class KeyPressed(index: Int, angle: Int) extends ClientInput

    decode[KeyPressed](input) match {
      case Right(KeyPressed(index, angle)) =>
        updateServoState(_.set(index, angle))
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

  def pipelineDescription(
    videoSrc: String,
    rtcType: Int,
    stunServerUrl: String,
  ): String = {
    s"""webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=$stunServerUrl
       | $videoSrc ! queue ! vp8enc deadline=1 ! rtpvp8pay pt=$rtcType !
       | queue ! application/x-rtp,media=video,encoding-name=VP8,payload=$rtcType ! sendrecv.""".stripMargin
  }
}
