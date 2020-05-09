package robolive

import org.freedesktop.gstreamer.{Element, GstObject}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}

sealed trait Event

object Event {
  final case class OnNegotiationNeeded(elem: Element, handler: WebRTCBin.CREATE_OFFER) extends Event
  final case class OnIceCandidate(sdpMLineIndex: Int, candidate: String) extends Event
  final case class OnOfferCreated(offer: WebRTCSessionDescription) extends Event
  final case class EndOfStream(source: GstObject) extends Event
  final case class ErrorMessage(source: GstObject, code: Int, message: String) extends Event
  final case class SdpMessageReceived(message: Message.Sdp) extends Event
  final case class IceCandidateReceived(message: Message.Ice) extends Event
}
