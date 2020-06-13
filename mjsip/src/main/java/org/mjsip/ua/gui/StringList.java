package org.mjsip.ua.gui;


import java.net.URL;
import java.util.Vector;

import org.zoolu.util.Configure;


/** Classs StringList handles a vector of Strings.
  * It can be used to load, manage, and save string values. 
  */
final class StringList extends Configure {
	

	/** The list */
	Vector list;

	/** File name */
	String file_name=null;

	/** File URL */
	URL file_url=null;


	/** Costructs a new StringList from the specified <i>file</i> */
	public StringList(String file) {
		list=new Vector();
		file_name=file;
		load();
	}
	

	/** Costructs a new StringList from the specified URL <i>url</i> */
	public StringList(URL url) {
		list=new Vector();
		file_url=url;
		load();
	}
	

	/** Loads list */
	public void load() {
		if (file_name!=null) loadFile(file_name);
		else
		if (file_url!=null) loadFile(file_url);
	}

	
	/** Saves list */
	public void save() {
		if (file_name!=null) saveFile(file_name);
	}


	/** Gets elements */
	public Vector getElements() {
		return list;
	}


	/** Gets the element at positon i */
	public String elementAt(int i) {
		return (String)list.elementAt(i);
	}


	/** Inserts element at positon i */
	public void insertElementAt(String elem, int i) {
		list.insertElementAt(elem,i);
	}


	/** Removes element at positon i */
	public void removeElementAt(int i) {
		list.removeElementAt(i);
	}


	/** Adds element */
	public void addElement(String elem) {
		list.addElement(elem);
	}


	/** Whether the element is present */
	public boolean contains(String elem) {
		return (indexOf(elem)>=0);
	}


	/** Index of the element (if present) */
	public int indexOf(String elem) {
		return list.indexOf(elem);
	}


	/** Whether an element that containg <i>subelem</i>*/
	/*public boolean containsSubElement(String subelem) {
		return indexOfSubElement(subelem)>=0;
	}*/


	/** Whether an element that containg <i>subelem</i>*/
	/*public int indexOfSubElement(String subelem) {
		for (int i=0; i<list.size(); i++)  {
			String elem=(String)list.elementAt(i);
			int index=elem.indexOf(subelem);
			if (index>=0 && index<elem.length()) return i;
		}
		return -1;
	}*/
	
		 
	/** Parses a single line (loaded from the config file) */
	protected void parseLine(String line) {
		list.addElement(line);
	}


	/** Converts the entire object into lines (to be saved into the config file) */
	protected String toLines() {
		String str="";
		for (int i=0; i<list.size(); i++)      {
			String elem=(String)list.elementAt(i);
			str+=elem+"\n";
		}
		return str;
	}   
}
