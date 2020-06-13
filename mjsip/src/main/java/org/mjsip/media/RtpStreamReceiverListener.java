package org.mjsip.media;



import org.zoolu.net.SocketAddress;



/** Listens for RtpStreamReceiver events. 
 */
public interface RtpStreamReceiverListener {
	
	/** When the remote socket address (source) is changed. */
	public void onRemoteSoAddressChanged(RtpStreamReceiver rr, SocketAddress remote_soaddr);

	/** When the stream receiver terminated. */
	public void onRtpStreamReceiverTerminated(RtpStreamReceiver rr, Exception error);

}
