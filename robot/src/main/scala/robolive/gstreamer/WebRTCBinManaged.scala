package robolive.gstreamer

import org.freedesktop.gstreamer.webrtc._
import org.freedesktop.gstreamer._
import org.slf4j.LoggerFactory
import robolive.gstreamer.GstManaged.GSTInit
import robolive.gstreamer.bindings.GstWebRTCDataChannel
import robolive.utils.Async.makeCollectionFromCallback
import sdp.SdpMessage

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.{Failure, Success}

final class WebRTCBinManaged(webRTCBin: WebRTCBin) extends AutoCloseable {
  import WebRTCBinManaged._

  private val logger = LoggerFactory.getLogger(getClass.getName)

  private def fromGstSdp(gstSdp: WebRTCSessionDescription): Either[Seq[String], SdpMessage] = {
    SdpMessage(gstSdp.getSDPMessage.toString)
  }

  private def toGstSdp(sdp: SdpMessage, sdpType: WebRTCSDPType): WebRTCSessionDescription = {
    val sdpString = sdp.toSdpString
    val gstSdp = new SDPMessage()
    gstSdp.parseBuffer(sdpString)
    new WebRTCSessionDescription(sdpType, gstSdp)
  }

  private def toGstSdpOffer(sdp: SdpMessage): WebRTCSessionDescription =
    toGstSdp(sdp, WebRTCSDPType.OFFER)

  private def toGstSdpAnswer(sdp: SdpMessage): WebRTCSessionDescription =
    toGstSdp(sdp, WebRTCSDPType.ANSWER)

  def negotiate(): Future[Element] = {
    val p = Promise[Element]()
    val cb: WebRTCBin.ON_NEGOTIATION_NEEDED = (elem: Element) => p.success(elem)
    webRTCBin.connect(cb)
    p.future
  }

  /**
   *
   * We wait for [[totalTimeout]] until webrtcbin reported COMPLETE state
   * Once ICE fetching state is COMPLETE, webrtcbin will send all items one by one
   * So we assume here that it's not necessary to wait for a long time if the state is COMPLETE
   * and we switch to [[shortTimeout]] that will be necessary.
   *
   * To recap timeline of events will look like this
   *  1. ICE gathering state is GATHERING
   *  2. few seconds passed
   *  3. WebRTCBin.ON_ICE_CANDIDATE callback is called with first candidate, ICE gathering state is COMPLETE
   *  4. all other candidates are being sent one after another
   *
   * Some real log of fetching:
   *   10:49:18,587 Fetching ICE candidates
   *   10:49:22,084 ICE candidate fetched: 1 1 UDP 2013266431 fe80::42:8dff:fe9d:743e 59461 typ host
   *   10:49:22,086 ICE candidate fetched: 2 1 TCP 1015027455 fe80::42:8dff:fe9d:743e 9 typ host tcptype active
   *   10:49:22,088 ICE candidate fetched: 3 1 TCP 1010833151 fe80::42:8dff:fe9d:743e 50113 typ host tcptype passive
   *   ...
   *   10:49:22,171 ICE candidate fetched: 59 1 TCP 1015026687 192.168.1.72 9 typ host tcptype active
   *   10:49:22,172 ICE candidate fetched: 60 1 TCP 1010832383 192.168.1.72 35221 typ host tcptype passive
   *   10:49:22,173 ICE candidate fetched: 1 2 UDP 2013266430 fe80::42:8dff:fe9d:743e 37946 typ host
   *   10:49:22,175 ICE candidate fetched: 2 2 TCP 1015027454 fe80::42:8dff:fe9d:743e 9 typ host tcptype active
   *   ...
   *   10:49:22,250 ICE candidate fetched: 79 1 UDP 1677722105 85.149.49.186 54479 typ srflx raddr 192.168.1.72 rport 54479
   *   10:49:22,251 ICE candidate fetched: 80 1 TCP 847254527 85.149.49.186 9 typ srflx raddr 192.168.1.72 rport 9 tcptype active
   *   10:49:22,251 ICE candidate fetched: 81 1 TCP 843060223 85.149.49.186 35221 typ srflx raddr 192.168.1.72 rport 35221 tcptype passive
   *
   * @param totalTimeout time to wait for ICE candidate to be added to result
   * @param shortTimeout time to wait for ICE candidate to be added to result after ICE gathering state became COMPLETE
   * @return
   */
  def fetchIceCandidates(
    totalTimeout: FiniteDuration = 10.seconds,
    shortTimeout: FiniteDuration = 500.millis
  )(implicit ec: ExecutionContext): Future[Seq[IceCandidate]] = {

    logger.info("Fetching ICE candidates")

    val (tryAddItem, result) = makeCollectionFromCallback[IceCandidate]("ICE gathering", totalTimeout, shortTimeout)

    result.onComplete {
      case Failure(exception) => logger.error("ICE candidates fetching failed", exception)
      case Success(candidates) => logger.info(s"Fetched ${candidates.size} ICE candidates")
    }

    val cb: WebRTCBin.ON_ICE_CANDIDATE = (sdpMLineIndex: Int, candidate: String) => {
      val value = candidate.substring(candidate.indexOf(":") + 1)
      val isAlmostDone = webRTCBin.getICEGatheringState == WebRTCICEGatheringState.COMPLETE

      if (tryAddItem(IceCandidate(sdpMLineIndex, value), isAlmostDone)) {
        logger.debug(s"ICE candidate fetched: $value")
      } else {
        logger.warn(s"ICE candidate fetched: $value, but the operation result was timed out")
      }
    }

    webRTCBin.connect(cb)

    result
  }


  def createOffer(): Future[SdpMessage] = {
    val p = Promise[SdpMessage]()
    val cb: WebRTCBin.CREATE_OFFER =
      (d: WebRTCSessionDescription) => {
        fromGstSdp(d) match {
          case Right(value) => p.success(value)
          case Left(errors) =>
            val err = s"Can not parse GStreamer SdpMessage: ${errors.mkString(", ")}"
            p.failure(new RuntimeException(err))
        }
      }
    webRTCBin.createOffer(cb)
    p.future
  }

  def createAnswer(): Future[SdpMessage] = {
    val p = Promise[SdpMessage]()
    val cb: WebRTCBin.CREATE_ANSWER =
      (d: WebRTCSessionDescription) =>
        fromGstSdp(d) match {
          case Right(value) => p.success(value)
          case Left(errors) =>
            val err = s"Can not parse GStreamer SdpMessage: ${errors.mkString(", ")}"
            p.failure(new RuntimeException(err))
        }
    webRTCBin.createAnswer(cb)
    p.future
  }

  def addIceCandidate(candidate: IceCandidate): Unit = {
    webRTCBin.addIceCandidate(candidate.sdpMLineIndex, s"candidate:${candidate.candidate}")
  }

  private def getIceCandidatesFromSdpMessage(message: SdpMessage): Seq[IceCandidate] = {
    for {
      (media, index) <- message.media.zipWithIndex
      candidate <- media.getRawAttributes("candidate")
      value <- candidate.valueOpt
    } yield {
      IceCandidate(index, value)
    }
  }

  def setLocalAnswer(answer: SdpMessage): Unit = {
    webRTCBin.setLocalDescription(toGstSdpAnswer(answer))
  }

  def setRemoteAnswer(answer: SdpMessage): Unit = {
    webRTCBin.setRemoteDescription(toGstSdpAnswer(answer))
    val candidates = getIceCandidatesFromSdpMessage(answer)
    candidates.foreach(addIceCandidate)
  }

  def setLocalOffer(offer: SdpMessage): Unit = {
    webRTCBin.setLocalDescription(toGstSdpOffer(offer))
  }

  def setRemoteOffer(offer: SdpMessage): Unit = {
    webRTCBin.setRemoteDescription(toGstSdpOffer(offer))
  }

  def getRemoteDescription: Either[Seq[String], SdpMessage] = fromGstSdp(
    webRTCBin.getRemoteDescription
  )

  def getLocalDescription: Either[Seq[String], SdpMessage] = fromGstSdp(
    webRTCBin.getLocalDescription
  )

  def setStunServer(server: String): Unit = webRTCBin.setStunServer(server)

  def getStunServer: String = webRTCBin.getStunServer

  def setTurnServer(server: String): Unit = webRTCBin.setTurnServer(server)

  def getTurnServer: String = webRTCBin.getTurnServer

  def getConnectionState: WebRTCPeerConnectionState = webRTCBin.getConnectionState

  def getICEGatheringState: WebRTCICEGatheringState = webRTCBin.getICEGatheringState

  def createDataChannel(name: String): Option[GstWebRTCDataChannel] = {
    Option(webRTCBin.emit(classOf[GstWebRTCDataChannel], "create-data-channel", name, null))
  }

  def play(): StateChangeReturn = webRTCBin.play()

  def pause(): StateChangeReturn = webRTCBin.pause()

  def ready(): StateChangeReturn = webRTCBin.ready()

  def stop(): StateChangeReturn = webRTCBin.stop()

  def isPlaying = webRTCBin.isPlaying

  def dispose(): Unit = webRTCBin.dispose()

  def link(element: Element): Unit = webRTCBin.link(element)

  def onPadAdded(f: Pad => Unit): Unit = {
    val callback = new Element.PAD_ADDED {
      override def padAdded(
        element: Element,
        pad: Pad
      ): Unit = f(pad)
    }
    webRTCBin.connect(callback)
  }

  override def close(): Unit = dispose()
}

object WebRTCBinManaged {
  final case class IceCandidate(sdpMLineIndex: Int, candidate: String)

  def apply(pipeline: Pipeline, name: String)(
    implicit ev: GSTInit.type
  ): WebRTCBinManaged = {
    val webRTCBin = pipeline.getElementByName(name).asInstanceOf[WebRTCBin]
    new WebRTCBinManaged(webRTCBin)
  }
}
