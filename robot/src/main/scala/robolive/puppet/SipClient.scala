package robolive.puppet

import java.util

import org.mjsip.sip.address.{NameAddress, SipURI}
import org.mjsip.sip.call._
import org.mjsip.sip.message.SipMessage
import org.mjsip.sip.provider.{SipProvider, SipProviderListener, SipStack}
import org.slf4j.LoggerFactory
import org.zoolu.util.{LogLevel, Logger}
import sdp.SdpMessage

import scala.concurrent.ExecutionContext

final class SipTransportHandler(sipCallToEventAdapter: SIPCallEventHandler, sipUser: SipUser)
    extends SipProviderListener {

  private val logger = LoggerFactory.getLogger(getClass.getName)

  /** When a new SipMessage is received by the SipProvider. */
  override def onReceivedMessage(sip_provider: SipProvider, message: SipMessage): Unit = {
    logger.debug(s"Message received: $message")
    new ExtendedCall(sip_provider, message, sipUser, sipCallToEventAdapter)
  }
}

final class SIPCallEventHandler(controller: WebRTCController, halt: () => ())(
  implicit ec: ExecutionContext
) extends ExtendedCallListener {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  /** Callback function called when arriving a new REFER method (transfer request). */
  override def onCallTransfer(
    call: ExtendedCall,
    refer_to: NameAddress,
    refered_by: NameAddress,
    refer: SipMessage
  ): Unit = logger.debug(s"IGNORED onCallTransfer($call $refer_to $refered_by $refer)")

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
    logger.debug(s"IGNORED onCallTransferAccepted")

  /** Callback function called when a call transfer is refused. */
  override def onCallTransferRefused(call: ExtendedCall, reason: String, resp: SipMessage): Unit = {
    logger.debug(s"onCallTransferRefused")
    halt()
  }

  /** Callback function called when a call transfer is successfully completed. */
  override def onCallTransferSuccess(call: ExtendedCall, notify: SipMessage): Unit =
    logger.debug(s"IGNORED onCallTransferSuccess")

  /** Callback function called when a call transfer is NOT sucessfully completed. */
  override def onCallTransferFailure(call: ExtendedCall, reason: String, notify: SipMessage): Unit = {
    logger.debug(s"onCallTransferFailure")
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
        controller.makeCall(extendedCall, sdpMessage)
      case Left(errors) =>
        logger.error(s"Error can not accept invite, sdp parsing failure: ${errors.mkString(", ")}")
    }
  }

  /** Callback function called when arriving a 183 Session Progress */
  override def onCallProgress(call: Call, resp: SipMessage): Unit =
    logger.debug(s"IGNORED onCallProgress")

  /** Callback function called when arriving a 180 Ringing */
  override def onCallRinging(call: Call, resp: SipMessage): Unit =
    logger.debug(s"IGNORED onCallRinging")

  /** Callback function called when arriving a 1xx response (e.g. 183 Session Progress) that has to be confirmed */
  override def onCallConfirmableProgress(call: Call, resp: SipMessage): Unit =
    logger.debug(s"IGNORED onCallConfirmableProgress")

  /** Callback function called when arriving a PRACK for a reliable 1xx response, that had to be confirmed */
  override def onCallProgressConfirmed(call: Call, resp: SipMessage, prack: SipMessage): Unit =
    logger.debug(s"IGNORED onCallProgressConfirmed")

  /** Callback function called when arriving a 2xx (call accepted) */
  override def onCallAccepted(call: Call, sdp: String, resp: SipMessage): Unit =
    logger.debug(s"IGNORED onCallAccepted")

  /** Callback function called when arriving a 4xx (call failure) */
  override def onCallRefused(call: Call, reason: String, resp: SipMessage): Unit = {
    logger.debug(s"onCallRefused")
    halt()
  }

  /** Callback function called when arriving a 3xx (call redirection) */
  override def onCallRedirected(
    call: Call,
    reason: String,
    contact_list: util.Vector[_],
    resp: SipMessage
  ): Unit = {
    logger.info(
      s"""onCallRedirected:
         |reason: $reason""".stripMargin
    )
    halt()
  }

  /** Callback function called when arriving an ACK method (call confirmed) */
  override def onCallConfirmed(call: Call, sdp: String, ack: SipMessage): Unit = {
    logger.info(
      s"""onCallConfirmed:
         |sdp: $sdp
         |ack: $ack""".stripMargin
    )
  }

  /** Callback function called when the invite expires */
  override def onCallTimeout(call: Call): Unit = {
    logger.debug(s"onCallTimeout")
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
    controller.clientInput(msg.getStringBody)
  }

  /** Callback function called when arriving a new Re-INVITE method (re-inviting/call modify) */
  override def onCallModify(call: Call, sdp: String, invite: SipMessage): Unit =
    logger.debug(s"IGNORED onCallModify")

  /** Callback function called when arriving a 2xx (re-invite/modify accepted) */
  override def onCallModifyAccepted(call: Call, sdp: String, resp: SipMessage): Unit =
    logger.debug(s"IGNORED onCallModifyAccepted")

  /** Callback function called when arriving a 4xx (re-invite/modify failure) */
  override def onCallModifyRefused(call: Call, reason: String, resp: SipMessage): Unit ={
    logger.debug(s"onCallModifyRefused")
    halt()
}

  /** Callback function called when a re-invite expires */
  override def onCallModifyTimeout(call: Call): Unit = {
    logger.debug(s"onCallModifyTimeout")
    halt()
  }

  /** Callback function called when arriving a CANCEL request */
  override def onCallCancel(call: Call, cancel: SipMessage): Unit ={
    logger.debug(s"onCallCancel")
    halt()
}

  /** Callback function called when arriving a new UPDATE method (update request). */
  override def onCallUpdate(call: Call, sdp: String, update: SipMessage): Unit = {
    logger.debug(s"Ignored onCallUpdate($call, $sdp, $update)")
  }

  /** Callback function called when arriving a 2xx for an UPDATE request */
  override def onCallUpdateAccepted(call: Call, sdp: String, resp: SipMessage): Unit = {
    logger.debug(s"Ignored onCallUpdateAccepted($call, $sdp, $resp)")
  }

  /** Callback function called when arriving a non 2xx for an UPDATE request */
  override def onCallUpdateRefused(call: Call, sdp: String, resp: SipMessage): Unit = {
    logger.debug(s"onCallUpdateRefused($call, $sdp, $resp)")
    halt()
  }

  /** Callback function called when arriving a BYE request */
  override def onCallBye(call: Call, bye: SipMessage): Unit = {
    logger.info {
      s"""onCallBye:
         |$bye
         |""".stripMargin
    }
    halt()
  }

  /** Callback function called when arriving a response for the BYE request (call closed) */
  override def onCallClosed(call: Call, resp: SipMessage): Unit = {
    logger.debug(s"onCallClosed")
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
    logger.info {
      s"""REGISTER OK:
         |target:  $nameAddress
         |contact: $nameAddress1
         |expires: $i
         |result:  $s
         |""".stripMargin
    }
  }

  override def onRegistrationFailure(
    registrationClient: RegistrationClient,
    nameAddress: NameAddress,
    nameAddress1: NameAddress,
    s: _root_.java.lang.String
  ): Unit = {
    logger.info {
      s"""REGISTER FAIL:
         |target:  $nameAddress
         |contact: $nameAddress1
         |result:  $s
         |""".stripMargin
    }
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

  private val zooluLogger = new Logger {
    override def log(message: String): Unit = logger.info(message)
    override def log(level: LogLevel, message: String): Unit = logger.info(message)
    override def log(level: LogLevel, source_class: Class[_], message: String): Unit = logger.info(message)
  }

  SipStack.message_logger = zooluLogger
  SipStack.event_logger = zooluLogger

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

  def start(expireTime: Int, renewTime: Int): Unit = {
    if (rc.isRegistering) rc.halt() // discard default registering loop
    rc.loopRegister(expireTime, renewTime)
  }

  def stop(): Unit = {
    rc.halt()
    sipProvider.halt()
  }

}
