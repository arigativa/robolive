/*
 * Copyright (C) 2005 Luca Veltri - University of Parma - Italy
 * 
 * This source code is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This source code is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this source code; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 * 
 * Author(s):
 * Luca Veltri (luca.veltri@unipr.it)
 */

package org.mjsip.server;


import org.mjsip.sip.address.GenericURI;
import org.mjsip.sip.address.SipURI;
import org.zoolu.net.SocketAddress;


/** PrefixProxyingRule is a ProxyingRule based on the prefix of URIs.
  */
class PrefixProxyingRule implements ProxyingRule {
	
	/** Prefix for the default rule. */
	public static final String DEFAULT_PREFIX="default";


	/** Matching prefix. */
	String prefix;

	/** Next-hop server. */
	SocketAddress nexthop;
	
	
	/** Creates a new PrefixProxyingRule. */
	public PrefixProxyingRule(String prefix, SocketAddress nexthop) {
		this.prefix=prefix;
		this.nexthop=nexthop;
	}
	

	/** Gets the proper next-hop SipURI for the selected URI.
	  * It returns the SipURI used to reach the selected URI.
	  * @param uri the selected destination URI
	  * @return the proper next-hop SipURI for the selected URI
	  * if the proxying rule matches the URI, otherwise it returns null. */
	public SipURI getNexthop(GenericURI uri) {
		if (!uri.isSipURI()) return null;
		// else
		SipURI sip_uri=new SipURI(uri);
		String username=sip_uri.getUserName();
		if ((username!=null && username.startsWith(prefix)) || prefix.equalsIgnoreCase(DEFAULT_PREFIX)) {
			return new SipURI(username,nexthop.getAddress().toString(),nexthop.getPort());
		}
		else return null;
	}

	/** Gets the String value. */
	public String toString() {
		return "{prefix="+prefix+","+"nexthop="+nexthop+"}";
	}
}  
