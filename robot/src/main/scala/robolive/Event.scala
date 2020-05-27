package robolive

import java.util

import org.freedesktop.gstreamer.{Element, GstObject}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}
import org.mjsip.sip.address.NameAddress
import org.mjsip.sip.call.{Call, ExtendedCall}
import org.mjsip.sip.message.SipMessage

sealed trait Event

object Event {
  final case class OnIceCandidate(sdpMLineIndex: Int, candidate: String) extends Event
  final case class OnAnswerCreated(offer: WebRTCSessionDescription) extends Event
  final case class EndOfStream(source: GstObject) extends Event
  final case class ErrorMessage(source: GstObject, code: Int, message: String) extends Event

  final case class OnCallTransfer(
    call: ExtendedCall,
    referTo: NameAddress,
    referedBy: NameAddress,
    refer: SipMessage
  ) extends Event
  final case class OnCallAttendedTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    replcall_id: String,
    refer: SipMessage
  ) extends Event
  final case class OnCallTransferAccepted(call: ExtendedCall, resp: SipMessage) extends Event
  final case class OnCallTransferRefused(call: ExtendedCall, reason: String, resp: SipMessage)
      extends Event
  final case class OnCallTransferSuccess(call: ExtendedCall, notifyMessage: SipMessage)
      extends Event
  final case class OnCallTransferFailure(
    call: ExtendedCall,
    reason: String,
    notifyMessage: SipMessage
  ) extends Event
  final case class OnCallInvite(
    call: ExtendedCall,
    callee: NameAddress,
    caller: NameAddress,
    sdp: String,
    invite: SipMessage
  ) extends Event
  final case class OnCallProgress(call: Call, resp: SipMessage) extends Event
  final case class OnCallRinging(call: Call, resp: SipMessage) extends Event
  final case class OnCallConfirmableProgress(call: Call, resp: SipMessage) extends Event
  final case class OnCallProgressConfirmed(call: Call, resp: SipMessage, prack: SipMessage)
      extends Event
  final case class OnCallAccepted(call: Call, sdp: String, resp: SipMessage) extends Event
  final case class OnCallRefused(call: Call, reason: String, resp: SipMessage) extends Event
  final case class OnCallRedirected(
    call: Call,
    reason: String,
    contact_list: util.Vector[_],
    resp: SipMessage
  ) extends Event
  final case class OnCallConfirmed(call: Call, sdp: String, ack: SipMessage) extends Event
  final case class OnCallTimeout(call: Call) extends Event
  final case class OnCallInfo(
    call: Call,
    info_package: String,
    content_type: String,
    body: Array[Byte],
    msg: SipMessage
  ) extends Event
  final case class OnCallModify(call: Call, sdp: String, invite: SipMessage) extends Event
  final case class OnCallModifyAccepted(call: Call, sdp: String, resp: SipMessage) extends Event
  final case class OnCallModifyRefused(call: Call, reason: String, resp: SipMessage) extends Event
  final case class OnCallModifyTimeout(call: Call) extends Event
  final case class OnCallCancel(call: Call, cancel: SipMessage) extends Event
  final case class OnCallUpdate(call: Call, sdp: String, update: SipMessage) extends Event
  final case class OnCallUpdateAccepted(call: Call, sdp: String, resp: SipMessage) extends Event
  final case class OnCallUpdateRefused(call: Call, sdp: String, resp: SipMessage) extends Event
  final case class OnCallBye(call: Call, bye: SipMessage) extends Event
  final case class OnCallClosed(call: Call, resp: SipMessage) extends Event
}
