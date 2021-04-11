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
  pipeline: Pipeline,
  stunServerUrl: String,
)(implicit gst: GstManaged.GSTInit.type) {
  import WebRTCController._

  private val logger = LoggerFactory.getLogger(getClass.getName)

  private var webRTCBin: WebRTCBinManaged = _
  private var disposeRtpPipeline: () => () = _
  private var state: WebRTCControllerPlayState = WebRTCControllerPlayState.Wait

  private def log(value: String) = {
    logger.info(s"Assembling call pipeline: $value")
  }

  private def start(rtcType: Int): StateChangeReturn = synchronized {
    try {
      log("start")
      val rtpPipeline = PipelineManaged("rtpPipeline", description(rtcType), logger)
      log("rtpPipeline instantiation")
      val outputRTPStream = rtpPipeline.getElementByName("outputRTPStream")

      webRTCBin = WebRTCBinManaged("sendrecv")

      webRTCBin.setStunServer(stunServerUrl)
      webRTCBin.onPadAdded(fakeSink(_, rtpPipeline))

      rtpPipeline.add(webRTCBin.underlying)
      log("rtpPipeline + webRTCBin")

      val isSynced = webRTCBin.underlying.syncStateWithParent()
      assert(isSynced, "Error: webRTCBin failed to sync with rtcPipeline")

      val isLinked = outputRTPStream.link(webRTCBin.underlying)
      log("rtpPipeline ! webRTCBin")
      assert(isLinked, "Error: outputRTPStream ! sendrecv")

      pipeline.add(rtpPipeline)
      log("pipeline + rtpPipeline")

      val isRTPVideoSrcToVpEncoderSynced = rtpPipeline.syncStateWithParent()
      assert(isRTPVideoSrcToVpEncoderSynced, "Error: RTPPipeline failed to sync with video stream pipeline")

      val tee = pipeline.getElementByName("t")
      val vp8EncoderSync = rtpPipeline.getElementByName("vpEncoder")

      val isRTPVideoSrcToVpEncoderLinked = tee.link(vp8EncoderSync)
      log("pipeline(t) ! vpEncoder(rtpInput)")
      assert(isRTPVideoSrcToVpEncoderLinked, s"Error: tee ! vpEncoder")

      disposeRtpPipeline = () => {
        logger.info("Disposing rtpPipeline ! webRTCBin")
        rtpPipeline.remove(webRTCBin.underlying)
        pipeline.remove(rtpPipeline)
        rtpPipeline.pause()
        rtpPipeline.stop()
        webRTCBin.pause()
        webRTCBin.stop()
        webRTCBin.dispose()
        rtpPipeline.dispose()
        webRTCBin = null
      }

      log(s"rtpPipeline playing: ${rtpPipeline.isPlaying}")

      log(s"Pipeline playing: ${pipeline.isPlaying}")

      StateChangeReturn.SUCCESS
    } catch {
      case err: Throwable =>
        logger.error("Error: fail to start pipeline", err)
        StateChangeReturn.FAILURE
    }
  }

  def dispose(): Unit = synchronized {
    if (disposeRtpPipeline != null) {
      disposeRtpPipeline()
      disposeRtpPipeline = null
    }
    logger.debug("State transition to 'WAIT'")
    state = WebRTCControllerPlayState.Wait
  }

  private def fakeSink(pad: Pad, pipeline: Pipeline): Unit = {
    logger.info(s"WebRTCBin: pad added: ${pad.getDirection} allowedCaps: ${pad.getAllowedCaps} currentCaps: ${pad.getCurrentCaps}")
    if (pad.getDirection == PadDirection.SRC) {
      logger.info("Route incoming WebRTC stream into fakesink")
      val fakesink = ElementFactory.make("fakesink", "incomingFakeSink")

      pipeline.add(fakesink)
      fakesink.syncStateWithParent()
      webRTCBin.link(fakesink)
    }
  }

  def answerCall(call: ExtendedCall, remoteSdp: SdpMessage)(
    implicit ec: ExecutionContext
  ): Future[Unit] = synchronized {
    state match {
      case WebRTCControllerPlayState.Wait =>
        logger.info("Processing incoming call")

        getRtpTypeForVP8Media(remoteSdp) match {
          case Right(rtpType) =>
            logger.info(s"Extracted rtpType: $rtpType")

            val stateChange = start(rtpType)
            if (stateChange == StateChangeReturn.SUCCESS || stateChange == StateChangeReturn.ASYNC) {
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

                  dispose()

                  Future.successful(call.refuse())
              }
            } else {
              logger.error(s"Error: failed to start: $stateChange")

              dispose()

              Future.successful(call.refuse())
            }
          case Left(errors) =>
            val errorString = errors.mkString(", ")
            logger.error(s"Error: fail to extract rtpType from SDP $errorString")

            dispose()

            Future.successful(call.refuse())
        }
      case WebRTCControllerPlayState.Busy =>
        logger.info("Robot is busy")
        Future.successful(call.hangup())
    }
  }
}

object WebRTCController {
  sealed trait WebRTCControllerPlayState

  object WebRTCControllerPlayState {
    case object Wait extends WebRTCControllerPlayState
    case object Busy extends WebRTCControllerPlayState
  }

  def getRtpTypeForVP8Media(sdp: SdpMessage): Either[Seq[String], Int] = {
    for {
      video <- sdp.getMedia("video").toRight(Seq("Video media not found"))
      rtpMaps <- video.getAttributes[Attributes.RtpMap]("rtpmap")
      attr <- rtpMaps.find(_.encodingName == "VP8").toRight(Seq("VP8 codec not found in RtpMap"))
    } yield {
      attr.payloadType
    }
  }

  def fixSdpForChrome(sdp: String) = {
    s"$sdp\n"
  }

  def description(rtcType: Int): String = {
    s"""queue name=vpEncoder ! vp8enc deadline=1 ! rtpvp8pay pt=$rtcType !
       | application/x-rtp,media=video,encoding-name=VP8,payload=$rtcType !
       | queue name=outputRTPStream""".stripMargin

  }
}
