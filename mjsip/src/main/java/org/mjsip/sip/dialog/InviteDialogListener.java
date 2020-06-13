/*
 * Copyright (C) 2005 Luca Veltri - University of Parma - Italy
 * 
 * This file is part of MjSip (http://www.mjsip.org)
 * 
 * MjSip is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * MjSip is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with MjSip; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 * 
 * Author(s):
 * Luca Veltri (luca.veltri@unipr.it)
 */

package org.mjsip.sip.dialog;



import org.mjsip.sip.address.NameAddress;
import org.mjsip.sip.header.MultipleHeader;
import org.mjsip.sip.message.SipMessage;



/** An InviteDialogListener listens for InviteDialog events.
  * It collects all InviteDialog callback functions.
  */
public interface InviteDialogListener {
	
	/** When an incoming INVITE is received. */ 
	public void onDlgInvite(InviteDialog dialog, NameAddress callee, NameAddress caller, String body, SipMessage msg);
 
	/** When an incoming Re-INVITE is received. */ 
	public void onDlgReInvite(InviteDialog dialog, String body, SipMessage msg);


	/** When a 1xx response is received for an INVITE request. */ 
	public void onDlgInviteProvisionalResponse(InviteDialog dialog, int code, String reason, String body, SipMessage msg);

	/** When a reliable 1xx response is received for an INVITE request.
	  * If {@link org.mjsip.sip.provider.SipStack#auto_prack} is false, method {@link InviteDialog#confirm1xx(SipMessage,String,byte[]) confirm1xx()} must be called for confirming the reception of the 1xx response. */ 
	public void onDlgInviteReliableProvisionalResponse(InviteDialog dialog, int code, String reason, String content_type, byte[] body, SipMessage resp);

	/** When a reliable 1xx response has been confirmed by the reception of a corresponding PRACK request. */
	public void onDlgInviteReliableProvisionalResponseConfirmed(InviteDialog dialog, int code, SipMessage resp, String content_type, byte[] body, SipMessage prack);

	/** When a reliable 1xx response has NOT been confirmed (with a PRACK), and the retransmission timeout expired. */
	public void onDlgInviteReliableProvisionalResponseTimeout(InviteDialog dialog, int code, SipMessage resp);
	
	/** When a 2xx successful final response is received for an INVITE request.
	  * If a body ("offer") has been included in the respose, method {@link InviteDialog#confirm2xxWithAnswer(NameAddress,String) confirm2xxWithAnswer()} must be explicitely called. */ 
	public void onDlgInviteSuccessResponse(InviteDialog dialog, int code, String reason, String body, SipMessage msg);
	/** When an incoming INVITE is accepted. */ 
	//public void onDlgAccepted(InviteDialog dialog);

	/** When a 3xx redirection response is received for an INVITE request. */ 
	public void onDlgInviteRedirectResponse(InviteDialog dialog, int code, String reason, MultipleHeader contacts, SipMessage msg);

	/** When a 400-699 failure response is received for an INVITE request. */ 
	public void onDlgInviteFailureResponse(InviteDialog dialog, int code, String reason, SipMessage msg);
	/** When an incoming INVITE is refused. */ 
	//public void onDlgRefused(InviteDialog dialog);

	/** When INVITE transaction expires */ 
	public void onDlgInviteTimeout(InviteDialog dialog);


	/** When a 1xx response response is received for a Re-INVITE request. */ 
	public void onDlgReInviteProvisionalResponse(InviteDialog dialog, int code, String reason, String body, SipMessage msg);

	/** When a 2xx successful final response is received for a Re-INVITE request. */ 
	public void onDlgReInviteSuccessResponse(InviteDialog dialog, int code, String reason, String body, SipMessage msg);
	/** When an incoming Re-INVITE is accepted. */ 
	//public void onDlgReInviteAccepted(InviteDialog dialog);

	/** When a 3xx redirection response is received for a Re-INVITE request. */ 
	//public void onDlgReInviteRedirectResponse(InviteDialog dialog, int code, String reason, MultipleHeader contacts, SipMessage msg);

	/** When a 400-699 failure response is received for a Re-INVITE request. */ 
	public void onDlgReInviteFailureResponse(InviteDialog dialog, int code, String reason, SipMessage msg);
	/** When an incoming Re-INVITE is refused. */ 
	//public void onDlgReInviteRefused(InviteDialog dialog);

	/** When a Re-INVITE transaction expires. */ 
	public void onDlgReInviteTimeout(InviteDialog dialog);


	/** When an incoming ACK is received for an INVITE transaction. */ 
	public void onDlgAck(InviteDialog dialog, String body, SipMessage msg);
	
	/** When the INVITE handshake is successful terminated and the call is active. */ 
	public void onDlgCall(InviteDialog dialog);


	/** When an incoming INFO is received. */ 
	public void onDlgInfo(InviteDialog dialog, String info_package, String content_type, byte[] body, SipMessage msg);

	/** When an incoming CANCEL is received for an INVITE transaction. */ 
	public void onDlgCancel(InviteDialog dialog, SipMessage msg);

	/** When an incoming UPDATE request is received within the dialog. */ 
	public void onDlgUpdate(InviteDialog dialog, String body, SipMessage msg);

	/** When a response is received for an UPDATE request. */ 
	public void onDlgUpdateResponse(InviteDialog dialog, int code, String reason, String body, SipMessage msg);


	/** When an incoming BYE is received */ 
	public void onDlgBye(InviteDialog dialog, SipMessage msg);      
	/** When a BYE request traqnsaction has been started. */ 
	//public void onDlgByeing(InviteDialog dialog);      
	
	/** When a success response is received for a Bye request. */ 
	public void onDlgByeSuccessResponse(InviteDialog dialog, int code, String reason, SipMessage msg);

	/** When a failure response is received for a Bye request. */ 
	public void onDlgByeFailureResponse(InviteDialog dialog, int code, String reason, SipMessage msg);

	/** When the dialog is finally closed (after receiving a BYE request, a BYE response, or after BYE timeout). */ 
	public void onDlgClosed(InviteDialog dialog);
}
