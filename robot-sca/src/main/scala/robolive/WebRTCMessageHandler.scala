package robolive

import org.freedesktop.gstreamer.{Bus, Element, GstObject}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}

final class WebRTCMessageHandler(
  outputChannel: ImpureWorldAdapter.OutputChannel[Models.InternalMessage],
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
