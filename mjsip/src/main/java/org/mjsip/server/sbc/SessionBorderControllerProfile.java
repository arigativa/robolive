package org.mjsip.server.sbc;


import java.util.Vector;

import org.zoolu.net.SocketAddress;
import org.zoolu.util.Configure;
import org.zoolu.util.Parser;


/**
 * SessionBorderControllerProfile maintains the SessionBorderController configuration.
 */
public class SessionBorderControllerProfile extends Configure {
	
		 
	// *********************** SBC configurations *********************

	/** Maximum time that the UDP relay remains active without receiving UDP datagrams (in milliseconds). */
	public long relay_timeout=60000; // 1min

	/** Refresh time of address-binding cache (in milliseconds) */
	public long binding_timeout=3600000;

	/** Minimum time between two changes of peer address (in milliseconds) */
	public int handover_time=0; //5000;

	/** Rate of keep-alive datagrams sent toward all registered UAs (in milliseconds).
	  * Set keepalive_time=0 to disable the sending of keep-alive datagrams */
	public long keepalive_time=0;

	/** Whether sending keepalive datagram only to UAs that explicitely request it through 'keep-alive' parameter. */
	//public boolean keepalive_selective=false;

	/** Whether sending keepalive datagram to all contacted UAs (also toward non-registered UAs) */
	public boolean keepalive_aggressive=false;

	/** Whether implementing symmetric RTP for NAT traversal. */
	//boolean symmetric_rtp=false;
	
	/** Minimum inter-packet departure time */
	public long interpacket_time=0; 

	/** Whether intercepting media traffics. */
	public boolean do_interception=false;

	/** Whether injecting new media flows. */
	public boolean do_active_interception=false;

	/** Sink address for media traffic interception. */
	public String sink_addr="127.0.0.1";

	/** Sink port for media traffic interception. */
	public int sink_port=0;

	/** Media address. */
	public String media_addr="0.0.0.0";

	/** Available media ports (default interval=[41000:41499]). */
	public Vector media_ports=null;

	/** First Available media port. */
	private int first_port=41000;
	/** Last Available media port. */
	private int last_port=41199;

	/** Backend proxy where all requests not coming from it are passed to. 
	  * It can be specified as FQDN or host_addr[:host_port].
	  * Use 'NONE' for not using a backend proxy (or let it undefined). */
	public SocketAddress backend_proxy=null;


	// ************************** costructors *************************
	
	/** Costructs a new SessionBorderControllerProfile */
	public SessionBorderControllerProfile() {
		init(null);
	}

	/** Costructs a new SessionBorderControllerProfile */
	public SessionBorderControllerProfile(String file) {
		init(file);
	}

	/** Inits the SessionBorderControllerProfile */
	private void init(String file) {
		loadFile(file);
		media_ports=new Vector();
		for (int i=first_port; i<=last_port; i+=2) media_ports.addElement(new Integer(i)); 
	}


	// **************************** methods ***************************

	/** Parses a single line (loaded from the config file) */
	protected void parseLine(String line) {
		String attribute;
		Parser par;
		int index=line.indexOf("=");
		if (index>0) {  attribute=line.substring(0,index).trim(); par=new Parser(line,index+1);  }
		else {  attribute=line; par=new Parser("");  }

		if (attribute.equals("relay_timeout")) { relay_timeout=par.getInt(); return; }
		if (attribute.equals("binding_timeout")) { binding_timeout=par.getInt(); return; }
		if (attribute.equals("handover_time")) { handover_time=par.getInt(); return; }
		if (attribute.equals("keepalive_time")) { keepalive_time=par.getInt(); return; }
		//if (attribute.equals("keepalive_selective")) { keepalive_selective=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("keepalive_aggressive")) { keepalive_aggressive=(par.getString().toLowerCase().startsWith("y")); return; }
		//if (attribute.equals("symmetric_rtp")) { symmetric_rtp=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("interpacket_time")) { interpacket_time=par.getInt(); return; }
		if (attribute.equals("do_interception")) { do_interception=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("do_active_interception")) { do_active_interception=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("sink_addr")) { sink_addr=par.getString(); return; }
		if (attribute.equals("sink_port")) { sink_port=par.getInt(); return; }
		if (attribute.equals("media_addr")) { media_addr=par.getString(); return; }
		if (attribute.equals("media_ports")) {
			char[] delim={' ','-',':'};
			first_port=Integer.parseInt(par.getWord(delim));
			last_port=Integer.parseInt(par.getWord(delim));
			return;
		}
		if (attribute.equals("backend_proxy")) {
			String soaddr=par.getString();
			if (soaddr==null || soaddr.length()==0 || soaddr.equalsIgnoreCase(Configure.NONE)) backend_proxy=null;
			else backend_proxy=new SocketAddress(soaddr);
			return;
		}
	}  
 
		
	/** Converts the entire object into lines (to be saved into the config file) */
	protected String toLines() {
		// currently not implemented..
		return toString();
	}
	
}
