package robolive

import java.util

import org.mjsip.sdp.SdpMessage
import org.mjsip.sip.address.{NameAddress, SipURI}
import org.mjsip.sip.call.{
  Call,
  ExtendedCall,
  ExtendedCallListener,
  RegistrationClient,
  RegistrationClientListener,
  SipUser
}
import org.mjsip.sip.message.SipMessage
import org.mjsip.sip.provider.{SipProvider, SipProviderListener}
import robolive.Main.pipelineDesc
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

final class SipTransportHandler(sipCallToEventAdapter: SIPCallEventHandler, sipUser: SipUser)
    extends SipProviderListener {

  /** When a new SipMessage is received by the SipProvider. */
  override def onReceivedMessage(sip_provider: SipProvider, message: SipMessage): Unit = {
    new ExtendedCall(sip_provider, message, sipUser, sipCallToEventAdapter)
  }
}

final class SIPCallEventHandler(controller: WebRTCController)(
  implicit ec: ExecutionContext,
  gst: GstManaged.GSTInit.type
) extends ExtendedCallListener {

  /** Callback function called when arriving a new REFER method (transfer request). */
  override def onCallTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    refer: SipMessage
  ): Unit = ???

  /** Callback function called when arriving a new REFER method (transfer request) with Replaces header, replacing an existing call. */
  override def onCallAttendedTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    replcall_id: String,
    refer: SipMessage
  ): Unit = ???

  /** Callback function called when a call transfer is accepted. */
  override def onCallTransferAccepted(call: ExtendedCall, resp: SipMessage): Unit = ???

  /** Callback function called when a call transfer is refused. */
  override def onCallTransferRefused(call: ExtendedCall, reason: String, resp: SipMessage): Unit =
    ???

  /** Callback function called when a call transfer is successfully completed. */
  override def onCallTransferSuccess(call: ExtendedCall, notify: SipMessage): Unit = ???

  /** Callback function called when a call transfer is NOT sucessfully completed. */
  override def onCallTransferFailure(call: ExtendedCall, reason: String, notify: SipMessage): Unit =
    ???

  /** Callback function called when arriving a new INVITE method (incoming call) */
  override def onCallInvite(
    call: Call,
    callee: NameAddress,
    caller: NameAddress,
    sdp: String,
    invite: SipMessage
  ): Unit = {
    val extendedCall = call.asInstanceOf[ExtendedCall]
    controller.makeCall(extendedCall, new SdpMessage(sdp))
  }

  /** Callback function called when arriving a 183 Session Progress */
  override def onCallProgress(call: Call, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a 180 Ringing */
  override def onCallRinging(call: Call, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a 1xx response (e.g. 183 Session Progress) that has to be confirmed */
  override def onCallConfirmableProgress(call: Call, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a PRACK for a reliable 1xx response, that had to be confirmed */
  override def onCallProgressConfirmed(call: Call, resp: SipMessage, prack: SipMessage): Unit = ???

  /** Callback function called when arriving a 2xx (call accepted) */
  override def onCallAccepted(call: Call, sdp: String, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a 4xx (call failure) */
  override def onCallRefused(call: Call, reason: String, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a 3xx (call redirection) */
  override def onCallRedirected(
    call: Call,
    reason: String,
    contact_list: util.Vector[_],
    resp: SipMessage
  ): Unit = ???

  /** Callback function called when arriving an ACK method (call confirmed) */
  override def onCallConfirmed(call: Call, sdp: String, ack: SipMessage): Unit = {
    println(
      s"""onCallConfirmed:
         |sdp: $sdp
         |ack: $ack""".stripMargin
    )
  }

  /** Callback function called when the invite expires */
  override def onCallTimeout(call: Call): Unit = ???

  /** Callback function called when arriving an  INFO method. */
  override def onCallInfo(
    call: Call,
    info_package: String,
    content_type: String,
    body: Array[Byte],
    msg: SipMessage
  ): Unit = ???

  /** Callback function called when arriving a new Re-INVITE method (re-inviting/call modify) */
  override def onCallModify(call: Call, sdp: String, invite: SipMessage): Unit = ???

  /** Callback function called when arriving a 2xx (re-invite/modify accepted) */
  override def onCallModifyAccepted(call: Call, sdp: String, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a 4xx (re-invite/modify failure) */
  override def onCallModifyRefused(call: Call, reason: String, resp: SipMessage): Unit = ???

  /** Callback function called when a re-invite expires */
  override def onCallModifyTimeout(call: Call): Unit = ???

  /** Callback function called when arriving a CANCEL request */
  override def onCallCancel(call: Call, cancel: SipMessage): Unit = ???

  /** Callback function called when arriving a new UPDATE method (update request). */
  override def onCallUpdate(call: Call, sdp: String, update: SipMessage): Unit = ???

  /** Callback function called when arriving a 2xx for an UPDATE request */
  override def onCallUpdateAccepted(call: Call, sdp: String, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a non 2xx for an UPDATE request */
  override def onCallUpdateRefused(call: Call, sdp: String, resp: SipMessage): Unit = ???

  /** Callback function called when arriving a BYE request */
  override def onCallBye(call: Call, bye: SipMessage): Unit = {
    println {
      s"""onCallBye:
         |$bye
         |""".stripMargin
    }
    controller.dispose()
  }

  /** Callback function called when arriving a response for the BYE request (call closed) */
  override def onCallClosed(call: Call, resp: SipMessage): Unit = ???
}

final class RegistrationClientHandler extends RegistrationClientListener {
  override def onRegistrationSuccess(
    registrationClient: RegistrationClient,
    nameAddress: NameAddress,
    nameAddress1: NameAddress,
    i: Int,
    s: String
  ): Unit = println {
    s"""REGISTER OK:
      |target:  $nameAddress
      |contact: $nameAddress1
      |expires: $i
      |result:  $s
      |""".stripMargin
  }
  override def onRegistrationFailure(
    registrationClient: RegistrationClient,
    nameAddress: NameAddress,
    nameAddress1: NameAddress,
    s: _root_.java.lang.String
  ): Unit = println {
    s"""REGISTER FAIL:
       |target:  $nameAddress
       |contact: $nameAddress1
       |result:  $s
       |""".stripMargin
  }
}

final case class SipConfig(
  registrarUri: String,
  name: String,
  protocol: String,
)

final class SipClient(
  sipEventHandler: SIPCallEventHandler,
  config: SipConfig,
) {
  val nameAddress = s"${config.name}@${config.registrarUri}"
  val sipUser = new SipUser(new NameAddress(nameAddress))
  val sipTransportHandler = new SipTransportHandler(sipEventHandler, sipUser)

  val sipProvider = new SipProvider(null, 0, Array(config.protocol))
  sipProvider.addPromiscuousListener(sipTransportHandler)

  val rc = {
    val toAddress = sipUser.getAddress
    val fromAddress = sipUser.getAddress
    val contactAddress = sipUser.getAddress
    val sipUri = new SipURI(config.registrarUri)

    new RegistrationClient(
      sipProvider,
      sipUri,
      toAddress,
      fromAddress,
      contactAddress,
      new RegistrationClientHandler
    )
  }

  if (rc.isRegistering) rc.halt()
  rc.loopRegister(30, 30)
}
