package org.mjsip.server;


import java.util.Vector;

import org.mjsip.sip.provider.SipProvider;
import org.mjsip.sip.provider.SipStack;
import org.zoolu.net.IpAddress;
import org.zoolu.net.SocketAddress;
import org.zoolu.util.Configure;
import org.zoolu.util.Parser;


/** ServerProfile maintains the server configuration.
  */
public class ServerProfile extends Configure {
	
	/** The default configuration file */
	private static String config_file="mjsip.cfg";


	// ********************* static configurations ********************

	/** Proxy transaction timeout (in milliseconds), that corresponds to Timer "C" of RFC2361; RFC2361 suggests C &gt; 3min = 180000ms. */
	public static int proxy_transaction_timeout=180000;


	// ********************* server configurations ********************

	/** The domain names that the server administers.
	  * <p>It lists the domain names for which the Location Service maintains user bindings.
	  * <br>Use 'auto-configuration' for automatic configuration of the domain name. */
	public String[] domain_names=null;
	/** Whether consider any port as valid local domain port
	  * (regardless which sip port is used). */
	public boolean domain_port_any=false;

	/** Whether the Server should act as Registrar (i.e. respond to REGISTER requests). */
	public boolean is_registrar=true;
	/** Maximum expires time (in seconds). */
	public int expires=3600;
	/** Whether the Registrar can register new users (i.e. REGISTER requests from unregistered users). */
	public boolean register_new_users=true;
	/** Whether the Server relays requests for (or to) non-local users. */
	public boolean is_open_proxy=true;
	/** The type of location service.
	  * You can specify the location service type (e.g. local, ldap, radius, mysql)
	  * or the class name (e.g. local.server.LocationServiceImpl). */
	public String location_service="local";
	/** The name of the location DB. */
	public String location_db="users.db";
	/** Whether location DB has to be cleaned at startup. */
	public boolean clean_location_db=false;

	/** Whether the Server authenticates local users. */
	public boolean do_authentication=false;
	/** Whether the Proxy authenticates users. */
	public boolean do_proxy_authentication=false;
	/** The authentication scheme.
	  * You can specify the authentication scheme name (e.g. Digest, AKA, etc.)
	  * or the class name (e.g. local.server.AuthenticationServerImpl). */
	public String authentication_scheme="Digest";
	/** The authentication realm.
	  * If not defined or equal to 'NONE' (default), the used via address is used instead. */
	public String authentication_realm=null;
	/** The type of authentication service.
	  * You can specify the authentication service type (e.g. local, ldap, radius, mysql)
	  * or the class name (e.g. local.server.AuthenticationServiceImpl). */
	public String authentication_service="local";
	/** The name of the authentication DB. */
	public String authentication_db="aaa.db";

	/** Whether maintaining a complete call log. */
	public boolean call_log=false;
	/** Whether the server should stay in the signaling path (uses Record-Route/Route) */
	public boolean on_route=false;
	/** Whether implementing the RFC3261 Loose Route (or RFC2543 Strict Route) rule */
	public boolean loose_route=true;
	/** Whether checking for loops before forwarding a request (Loop Detection). In RFC3261 it is optional. */
	public boolean loop_detection=true;

	/** Array of ProxyingRules based on pairs of username or phone prefix and corresponding nexthop address.
	  * It provides static rules for proxying number-based SIP-URI the server is responsible for.
	  * Use "default" (or "*") as default prefix.
	  * Example: <br>
	  * server is responsible for the domain 'example.com' <br>
	  * phone_proxying_rules={prefix=0123,nexthop=127.0.0.2:7002} {prefix=*,nexthop=127.0.0.3:7003} <br>
	  * a message with recipient 'sip:01234567@example.com' is forwarded to 'sip:01234567@127.0.0.2:7002'
	  */
	public ProxyingRule[] authenticated_phone_proxying_rules=null;
	public ProxyingRule[] phone_proxying_rules=null;

	/** Array of ProxyingRules based on pairs of destination domain and corresponding nexthop address.
	  * It provides static rules for proxying domain-based SIP-URI the server is NOT responsible for.
	  * It make the server acting (also) as 'Interrogating' Proxy, i.e. I-CSCF in the 3G networks.
	  * Example: <br>
	  * server is responsible for the domain 'example.com' <br>
	  * domain_proxying_rules={domain=domain1.foo,nexthop=proxy.example.net:5060} <br>
	  * a message with recipient 'sip:01234567@domain1.foo' is forwarded to 'sip:01234567@proxy.example.net:5060'
	  */
	public ProxyingRule[] authenticated_domain_proxying_rules=null;
	public ProxyingRule[] domain_proxying_rules=null;


	// ******************** undocumented parametes ********************

	/** Whether maintaining a memory log. */
	public boolean memory_log=false;


	// ************************** costructors *************************

	/** Costructs a new ServerProfile */
	public ServerProfile(String file) {
		// load SipStack first
		if (!SipStack.isInit()) SipStack.init();
		// load configuration
		loadFile(file);
		// post-load manipulation
		if (authentication_realm!=null && authentication_realm.equals(Configure.NONE)) authentication_realm=null;
		if (domain_names==null) domain_names=new String[0];
		if (authenticated_phone_proxying_rules==null) authenticated_phone_proxying_rules=new ProxyingRule[0];
		if (phone_proxying_rules==null) phone_proxying_rules=new ProxyingRule[0];
		if (authenticated_domain_proxying_rules==null) authenticated_domain_proxying_rules=new ProxyingRule[0];
		if (domain_proxying_rules==null) domain_proxying_rules=new ProxyingRule[0];
	}


	/** Parses a single line of the file */
	protected void parseLine(String line) {
		String attribute;
		Parser par;
		int index=line.indexOf("=");
		if (index>0) {  attribute=line.substring(0,index).trim(); par=new Parser(line,index+1);  }
		else {  attribute=line; par=new Parser("");  }

		if (attribute.equals("proxy_transaction_timeout")) { proxy_transaction_timeout=par.getInt(); return; }
		if (attribute.equals("is_registrar")) { is_registrar=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("expires"))        { expires=par.getInt(); return; }
		if (attribute.equals("register_new_users")) { register_new_users=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("is_open_proxy")) { is_open_proxy=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("location_service")) { location_service=par.getString(); return; }
		if (attribute.equals("location_db")) { location_db=par.getString(); return; }
		if (attribute.equals("clean_location_db")) { clean_location_db=(par.getString().toLowerCase().startsWith("y")); return; }

		if (attribute.equals("do_authentication")) { do_authentication=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("do_proxy_authentication")) { do_proxy_authentication=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("authentication_scheme")) { authentication_scheme=par.getString(); return; }
		if (attribute.equals("authentication_realm")) { authentication_realm=par.getString(); return; }
		if (attribute.equals("authentication_service")) { authentication_service=par.getString(); return; }
		if (attribute.equals("authentication_db")) { authentication_db=par.getString(); return; }

		if (attribute.equals("call_log")) { call_log=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("on_route")) { on_route=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("loose_route")) { loose_route=(par.getString().toLowerCase().startsWith("y")); return; }
		if (attribute.equals("loop_detection")) { loop_detection=(par.getString().toLowerCase().startsWith("y")); return; }

		if (attribute.equals("domain_port_any")) { domain_port_any=(par.getString().toLowerCase().startsWith("y")); return; }

		if (attribute.equals("domain_names")) {
			char[] delim={' ',','};
			Vector aux=new Vector();
			do {
				String domain=par.getWord(delim);
				if (domain.equals(SipProvider.AUTO_CONFIGURATION)) {
					// auto configuration
					IpAddress host_addr=IpAddress.getLocalHostAddress();
					aux.addElement(host_addr.toString());
				}
				else {
					// manual configuration
					aux.addElement(domain);
				}
			}
			while (par.hasMore());
			domain_names=new String[aux.size()];
			for (int i=0; i<aux.size(); i++) domain_names[i]=(String)aux.elementAt(i);
			return;
		}    
		if (attribute.equals("authenticated_phone_proxying_rules")) {
			char[] delim={' ',',',';','}'};
			Vector aux=new Vector();
			par.goTo('{');
			while (par.hasMore()) {
				par.goTo("prefix").skipN(6).goTo('=').skipChar();
				String prefix=par.getWord(delim);
				if (prefix.equals("*")) prefix=PrefixProxyingRule.DEFAULT_PREFIX;
				par.goTo("nexthop").skipN(7).goTo('=').skipChar();
				String nexthop=par.getWord(delim);
				aux.addElement(new PrefixProxyingRule(prefix,new SocketAddress(nexthop)));
				par.goTo('{');
			}
			authenticated_phone_proxying_rules=new ProxyingRule[aux.size()];
			for (int i=0; i<aux.size(); i++) authenticated_phone_proxying_rules[i]=(ProxyingRule)aux.elementAt(i);
			return;
		}
		if (attribute.equals("phone_proxying_rules")) {
			char[] delim={' ',',','}'};
			Vector aux=new Vector();
			par.goTo('{');
			while (par.hasMore()) {
				par.goTo("prefix").skipN(6).goTo('=').skipChar();
				String prefix=par.getWord(delim);
				if (prefix.equals("*")) prefix=PrefixProxyingRule.DEFAULT_PREFIX;
				par.goTo("nexthop").skipN(7).goTo('=').skipChar();
				String nexthop=par.getWord(delim);
				aux.addElement(new PrefixProxyingRule(prefix,new SocketAddress(nexthop)));
				par.goTo('{');
			}
			phone_proxying_rules=new ProxyingRule[aux.size()];
			for (int i=0; i<aux.size(); i++) phone_proxying_rules[i]=(ProxyingRule)aux.elementAt(i);
			return;
		}
		if (attribute.equals("authenticated_domain_proxying_rules")) {
			char[] delim={' ',',','}'};
			Vector aux=new Vector();
			par.goTo('{');
			while (par.hasMore()) {
				par.goTo("domain").skipN(6).goTo('=').skipChar();
				String prefix=par.getWord(delim);
				par.goTo("nexthop").skipN(7).goTo('=').skipChar();
				String nexthop=par.getWord(delim);
				aux.addElement(new DomainProxyingRule(prefix,new SocketAddress(nexthop)));
				par.goTo('{');
			}
			authenticated_domain_proxying_rules=new ProxyingRule[aux.size()];
			for (int i=0; i<aux.size(); i++) authenticated_domain_proxying_rules[i]=(ProxyingRule)aux.elementAt(i);
			return;
		}
		if (attribute.equals("domain_proxying_rules")) {
			char[] delim={' ',',','}'};
			Vector aux=new Vector();
			par.goTo('{');
			while (par.hasMore()) {
				par.goTo("domain").skipN(6).goTo('=').skipChar();
				String prefix=par.getWord(delim);
				par.goTo("nexthop").skipN(7).goTo('=').skipChar();
				String nexthop=par.getWord(delim);
				aux.addElement(new DomainProxyingRule(prefix,new SocketAddress(nexthop)));
				par.goTo('{');
			}
			domain_proxying_rules=new ProxyingRule[aux.size()];
			for (int i=0; i<aux.size(); i++) domain_proxying_rules[i]=(ProxyingRule)aux.elementAt(i);
			return;
		}

		if (attribute.equals("memory_log")) { memory_log=(par.getString().toLowerCase().startsWith("y")); return; }

	}


	/** Converts the entire object into lines (to be saved into the config file) */
	protected String toLines() {
		// currently not implemented..
		return toString();
	}


	/** Gets a String value for this object */
	public String toString() {
		return domain_names.toString();
	}

}
