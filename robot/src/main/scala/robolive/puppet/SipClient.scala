package robolive.puppet

import java.util
import org.mjsip.sip.address.{NameAddress, SipURI}
import org.mjsip.sip.call._
import org.mjsip.sip.message.SipMessage
import org.mjsip.sip.provider.{SipProvider, SipProviderListener, SipStack}
import org.slf4j.{LoggerFactory, ZooluLoggerAdapter}
import robolive.managed.ClientInputInterpreter
import sdp.SdpMessage

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

final class SipTransportHandler(sipCallToEventAdapter: SIPCallEventHandler, sipUser: SipUser)
    extends SipProviderListener {

  private val logger = LoggerFactory.getLogger(getClass.getName)

  /** When a new SipMessage is received by the SipProvider. */
  override def onReceivedMessage(sip_provider: SipProvider, message: SipMessage): Unit = {
    logger.info(s"Message received: $message")

    if (message.isInvite) {
      val call = new ExtendedCall(sip_provider, message, sipUser, sipCallToEventAdapter)
      logger.info(s"Created a new call ${call.getCallId} for a message ${message.getRequestLine}")
    }
  }
}

final class SIPCallEventHandler(
  controller: WebRTCController,
  clientInputInterpreter: ClientInputInterpreter,
  halt: () => ()
)(
  implicit ec: ExecutionContext
) extends ExtendedCallListener {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  /** Callback function called when arriving a new REFER method (transfer request). */
  override def onCallTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    refer: SipMessage
  ): Unit = logger.debug(s"Ignored: onCallTransfer")

  /** Callback function called when arriving a new REFER method (transfer request) with Replaces header, replacing an existing call. */
  override def onCallAttendedTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    replcall_id: String,
    refer: SipMessage
  ): Unit = ???

  /** Callback function called when a call transfer is accepted. */
  override def onCallTransferAccepted(call: ExtendedCall, resp: SipMessage): Unit =
    logger.debug(s"Ignored: onCallTransferAccepted")

  /** Callback function called when a call transfer is refused. */
  override def onCallTransferRefused(call: ExtendedCall, reason: String, resp: SipMessage): Unit = {
    logger.debug(s"Halt: onCallTransferRefused")
    halt()
  }

  /** Callback function called when a call transfer is successfully completed. */
  override def onCallTransferSuccess(call: ExtendedCall, notify: SipMessage): Unit =
    logger.debug(s"Ignored: onCallTransferSuccess")

  /** Callback function called when a call transfer is NOT sucessfully completed. */
  override def onCallTransferFailure(
    call: ExtendedCall,
    reason: String,
    notify: SipMessage
  ): Unit = {
    logger.debug(s"Halt: onCallTransferFailure")
    halt()
  }

  /** Callback function called when arriving a new INVITE method (incoming call) */
  override def onCallInvite(
    call: Call,
    callee: NameAddress,
    caller: NameAddress,
    sdp: String,
    invite: SipMessage
  ): Unit = {
    SdpMessage(sdp) match {
      case Right(sdpMessage) =>
        val extendedCall = call.asInstanceOf[ExtendedCall]
        controller.answerCall(extendedCall, sdpMessage)
      case Left(errors) =>
        logger.error(s"Error can not accept invite, sdp parsing failure: ${errors.mkString(", ")}")
    }
  }

  /** Callback function called when arriving a new UPDATE method (update request). */
  override def onCallUpdate(call: Call, sdp: String, update: SipMessage): Unit = {
    call.acceptUpdate(sdp)
    logger.info(s"Accepted: onCallUpdate")
  }

  /** Callback function called when arriving a 183 Session Progress */
  override def onCallProgress(call: Call, resp: SipMessage): Unit =
    logger.debug(s"Ignored: onCallProgress")

  /** Callback function called when arriving a 180 Ringing */
  override def onCallRinging(call: Call, resp: SipMessage): Unit =
    logger.debug(s"Ignored: onCallRinging")

  /** Callback function called when arriving a 1xx response (e.g. 183 Session Progress) that has to be confirmed */
  override def onCallConfirmableProgress(call: Call, resp: SipMessage): Unit =
    logger.debug(s"Ignore: onCallConfirmableProgress")

  /** Callback function called when arriving a PRACK for a reliable 1xx response, that had to be confirmed */
  override def onCallProgressConfirmed(call: Call, resp: SipMessage, prack: SipMessage): Unit =
    logger.debug(s"Ignored: onCallProgressConfirmed")

  /** Callback function called when arriving a 2xx (call accepted) */
  override def onCallAccepted(call: Call, sdp: String, resp: SipMessage): Unit =
    logger.debug(s"Ignored: onCallAccepted")

  /** Callback function called when arriving a 4xx (call failure) */
  override def onCallRefused(call: Call, reason: String, resp: SipMessage): Unit = {
    logger.debug(s"Halt: onCallRefused")
    halt()
  }

  /** Callback function called when arriving a 3xx (call redirection) */
  override def onCallRedirected(
    call: Call,
    reason: String,
    contact_list: util.Vector[_],
    resp: SipMessage
  ): Unit = {
    logger.info("Halt: onCallRedirected")
    halt()
  }

  /** Callback function called when arriving an ACK method (call confirmed) */
  override def onCallConfirmed(call: Call, sdp: String, ack: SipMessage): Unit = {
    logger.info("Ignored: onCallConfirmed")
  }

  /** Callback function called when the invite expires */
  override def onCallTimeout(call: Call): Unit = {
    logger.debug(s"Halt: onCallTimeout")
    halt()
  }

  /** Callback function called when arriving an  INFO method. */
  override def onCallInfo(
    call: Call,
    info_package: String,
    content_type: String,
    body: Array[Byte],
    msg: SipMessage
  ): Unit = {
    val result = clientInputInterpreter.clientInput(msg.getStringBody)
    result.onComplete {
      case Failure(exception) =>
        call.respondSuccess(msg, "text/plain", s"error: ${exception.getMessage}")
      case Success(value) =>
        call.respondSuccess(msg, "text/plain", value)
    }
  }

  /** Callback function called when arriving a new Re-INVITE method (re-inviting/call modify) */
  override def onCallModify(call: Call, sdp: String, invite: SipMessage): Unit =
    logger.debug(s"Ignored: onCallModify")

  /** Callback function called when arriving a 2xx (re-invite/modify accepted) */
  override def onCallModifyAccepted(call: Call, sdp: String, resp: SipMessage): Unit =
    logger.debug(s"Ignored: onCallModifyAccepted")

  /** Callback function called when arriving a 4xx (re-invite/modify failure) */
  override def onCallModifyRefused(call: Call, reason: String, resp: SipMessage): Unit = {
    logger.debug(s"Halt: onCallModifyRefused")
    halt()
}

  /** Callback function called when a re-invite expires */
  override def onCallModifyTimeout(call: Call): Unit = {
    logger.debug(s"Halt: onCallModifyTimeout")
    // halt()
  }

  /** Callback function called when arriving a CANCEL request */
  override def onCallCancel(call: Call, cancel: SipMessage): Unit = {
    logger.debug(s"Halt: onCallCancel")
    halt()
}


  /** Callback function called when arriving a 2xx for an UPDATE request */
  override def onCallUpdateAccepted(call: Call, sdp: String, resp: SipMessage): Unit = {
    logger.debug(s"Ignored: onCallUpdateAccepted")
  }

  /** Callback function called when arriving a non 2xx for an UPDATE request */
  override def onCallUpdateRefused(call: Call, sdp: String, resp: SipMessage): Unit = {
    logger.debug(s"Halt: onCallUpdateRefused")
    halt()
  }

  /** Callback function called when arriving a BYE request */
  override def onCallBye(call: Call, bye: SipMessage): Unit = {
    logger.debug("Halt: onCallBye")
    halt()
  }

  /** Callback function called when arriving a response for the BYE request (call closed) */
  override def onCallClosed(call: Call, resp: SipMessage): Unit = {
    logger.debug(s"Halt: onCallClosed")
    halt()
  }
}

final class RegistrationClientHandler(halt: () => ()) extends RegistrationClientListener {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  override def onRegistrationSuccess(
    registrationClient: RegistrationClient,
    nameAddress: NameAddress,
    nameAddress1: NameAddress,
    i: Int,
    s: String
  ): Unit = {
    logger.info("Ignored: onRegistrationSuccess")
  }

  override def onRegistrationFailure(
    registrationClient: RegistrationClient,
    nameAddress: NameAddress,
    nameAddress1: NameAddress,
    s: _root_.java.lang.String
  ): Unit = {
    logger.info("Halt: onRegistrationFailure")
    halt()
  }
}

final case class SipConfig(
  registrarUri: String,
  name: String,
)

final class SipClient(
  sipEventHandler: SIPCallEventHandler,
  registrationClientHandler: RegistrationClientHandler,
  config: SipConfig,
) {
  private val nameAddress = s"${config.name}@${config.registrarUri.replaceFirst("^sip[s]?:", "")}"
  private val sipUser = new SipUser(new NameAddress(nameAddress))
  private val sipTransportHandler = new SipTransportHandler(sipEventHandler, sipUser)

  private val logger = LoggerFactory.getLogger(getClass)

  SipStack.message_logger = new ZooluLoggerAdapter(logger)
  SipStack.event_logger = new ZooluLoggerAdapter(logger)

  private val sipProvider = {
    val provider = new SipProvider(null, 0, Array(SipProvider.PROTO_TCP, SipProvider.PROTO_TLS))
    provider.addPromiscuousListener(sipTransportHandler)
    provider
  }

  private val rc = {
    val toAddress = sipUser.getAddress
    val fromAddress = sipUser.getAddress
    val contactAddress = sipUser.getAddress
    val registrarUri = new SipURI(config.registrarUri)

    new RegistrationClient(
      sipProvider,
      registrarUri,
      toAddress,
      fromAddress,
      contactAddress,
      registrationClientHandler,
    )
  }

  def start(expireTime: Int): Unit = {
    if (rc.isRegistering) rc.halt() // discard default registering loop
    rc.loopRegister(expireTime, (expireTime * 0.5).toInt)
  }

  def stop(): Unit = {
    rc.halt()
    sipProvider.halt()
  }

}
