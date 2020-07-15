package robolive.gstreamer

import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger

import org.freedesktop.gstreamer.webrtc._
import org.freedesktop.gstreamer.{Element, Pad, Pipeline, SDPMessage, StateChangeReturn}
import sdp.SdpMessage
import robolive.gstreamer.GstManaged.GSTInit
import robolive.gstreamer.bindings.GstWebRTCDataChannel
import sdp.SdpMessage.{AttributeValueDecoder, RawValueAttribute}

import scala.concurrent.{Future, Promise}

final class WebRTCBinManaged(webRTCBin: WebRTCBin) extends AutoCloseable {
  import WebRTCBinManaged._

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

  def fetchIceCandidates(): Future[Seq[IceCandidate]] = {
    val p = Promise[Seq[IceCandidate]]()
    val cs = new ConcurrentLinkedQueue[IceCandidate]()
    val candidatesCount = new AtomicInteger(0)
    val cb: WebRTCBin.ON_ICE_CANDIDATE = (sdpMLineIndex: Int, candidate: String) => {
      val value = candidate.substring(candidate.indexOf(":") + 1)
      cs.add(IceCandidate(sdpMLineIndex, value))
      if (candidatesCount.incrementAndGet() > 20 && !p.isCompleted) {
        import scala.jdk.CollectionConverters._
        p.success(cs.iterator().asScala.toSeq)
      }
    }
    webRTCBin.connect(cb)
    p.future
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
    val candidates = getIceCandidatesFromSdpMessage(offer)
    candidates.foreach(addIceCandidate)
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
