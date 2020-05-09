package robolive

import org.freedesktop.gstreamer.{Bus, Element, GstObject}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import robolive.Event._

final class WebRTCEventsHandler(
  events: ImpureWorldAdapter.OutputChannel[Event]
) extends WebRTCBin.ON_NEGOTIATION_NEEDED with WebRTCBin.ON_ICE_CANDIDATE
    with WebRTCBin.CREATE_OFFER with Bus.EOS with Bus.ERROR {
  override def onNegotiationNeeded(elem: Element): Unit =
    events.put(OnNegotiationNeeded(elem, this))

  override def onIceCandidate(sdpMLineIndex: Int, candidate: String): Unit =
    events.put(OnIceCandidate(sdpMLineIndex, candidate))

  override def onOfferCreated(offer: WebRTCSessionDescription): Unit =
    events.put(OnOfferCreated(offer))

  override def endOfStream(source: GstObject): Unit =
    events.put(EndOfStream(source))

  override def errorMessage(source: GstObject, code: Int, message: String): Unit =
    events.put(ErrorMessage(source, code, message))
}
