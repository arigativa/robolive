/*
 * Copyright (C) 2006 Luca Veltri - University of Parma - Italy
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

package org.zoolu.sound;


import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.SourceDataLine;

import org.zoolu.util.Pipe;
import org.zoolu.util.PipeInputStream;
import org.zoolu.util.PipeOutputStream;


/** SourceLineAudioOutputStream extends AudioOutputStream providing a useful API
  * for audio playout equivalent to javax.sound.sampled.AudioInputStream
  * used for audio capturing.
  * <p>
  * SourceLineAudioOutputStream includes audio codec conversion, like
  * javax.sound.sampled.AudioSystem does for the corresponding
  * javax.sound.sampled.AudioInputStream class.
  */
class SourceLineAudioOutputStream extends AudioOutputStream {
	
	/** Whether printing debugging information on standard error output. */
	public static boolean DEBUG=false;
	
	/** Internal buffer size. */
	protected static final int INTERNAL_BUFFER_SIZE=40960;

	/** The SourceDataLine */
	protected SourceDataLine source_line;

	/** Converted InputStream. */
	protected InputStream converted_input_stream;

	/** Ingress OutputStream piped within the converted InputStream. */
	protected OutputStream ingress_output_stream;

	/** Internal buffer. */
	private byte[] internal_buffer=new byte[INTERNAL_BUFFER_SIZE];


	/** Creates a new SourceLineAudioOutputStream as simple wrapper of SourceDataLine. */
	public SourceLineAudioOutputStream(SourceDataLine source_line) {
		super(source_line.getFormat());
		this.source_line=source_line;
		converted_input_stream=null;
		ingress_output_stream=null;
	}

	
	/** Creates a new SourceLineAudioOutputStream with a specified AudioFormat, as wrapper of SourceDataLine.
	  * It converts the AudioFormat <i>format</i> into the corresponding AudioFormat of <i>source_line</i>. */
	public SourceLineAudioOutputStream(AudioFormat format, SourceDataLine source_line) throws IOException {
		super(format);
		this.source_line=source_line;

		// Note: My implementation of PipeInputStream and PipeOutputStream seems to be quite faster than the equivalent PipedInputStream and PipedOutputStream
		//PipedInputStream piped_input_stream=new PipedInputStream();
		//output_stream=new PipedOutputStream(piped_input_stream);
		Pipe pipe=new Pipe(INTERNAL_BUFFER_SIZE);
		InputStream piped_input_stream=new PipeInputStream(pipe);
		ingress_output_stream=new PipeOutputStream(pipe);
		AudioInputStream audio_input_stream=new AudioInputStream(piped_input_stream,format,-1);
		if (audio_input_stream==null) {
			throw new IOException("Failed while creating a new AudioInputStream.");
		}
		
		converted_input_stream=AudioSystem.getAudioInputStream(source_line.getFormat(),audio_input_stream);
		printOut("input codec: "+format.toString());
		printOut("output codec: "+source_line.getFormat().toString());
		if (converted_input_stream==null) {
			throw new IOException("Failed while getting a transcoded AudioInputStream from AudioSystem for input codec: "+format.toString()+", and output codec: "+source_line.getFormat().toString()+".");
		}
	}


	/** Closes this output stream and releases any system resources associated with this stream. */
	public void close() {
		//source_line.close();
		try  {
			converted_input_stream.close();
			ingress_output_stream.close();
		}
		catch (IOException e) {}
	}

  
	/** Flushes this output stream and forces any buffered output bytes to be written out. */
	public void flush() {
		source_line.flush();
	}

	
	/** Writes b.length bytes from the specified byte array to this output stream. */
	public void write(byte[] b) throws IOException {
		write(b,0,b.length);
	}

	
	/** Writes len bytes from the specified byte array starting at offset off to this output stream. */
	public void write(byte[] buf, int off, int len) throws IOException {
		//printDebug("DEBUG: SourceLineAudioOutputStream: write(): buf,off="+off+", len="+len);
		if (ingress_output_stream!=null) {
			ingress_output_stream.write(buf,off,len);
			int available=converted_input_stream.available();
			//printDebug("DEBUG: SourceLineAudioOutputStream: available: "+available);
			// @@@@@@@@@@@ PATCH for codec implementations (like the tritonus's GSM) that do not correctly support method available()
			//if (available==0) available=internal_buffer.length; // otherwise you could try to put =320; that is 20ms
			if (available==0) available=320; // we suppose that 320 is the minimum number of available converted bytes that result after writing this block of input bytes; 320 bytes correspond to 20ms of audio in case of PCM linear at 8000Hz
			// @@@@@@@@@@@ end of PATCH
			if (available>internal_buffer.length) available=internal_buffer.length;
			//printDebug("DEBUG: SourceLineAudioOutputStream: available: "+available);
			len=converted_input_stream.read(internal_buffer,0,available);
			//printDebug("DEBUG: SourceLineAudioOutputStream: len: "+len);
			source_line.write(internal_buffer,0,len);
			//printDebug("DEBUG: SourceLineAudioOutputStream: write(): end");
		}
		else {
			source_line.write(buf,off,len);
		}
	}

  
	/** Writes the specified byte to this output stream. */
	public void write(int b) throws IOException {
		if (ingress_output_stream!=null) {
			ingress_output_stream.write(b);
			int len=converted_input_stream.read(internal_buffer,0,internal_buffer.length);
			source_line.write(internal_buffer,0,len);
		}
		else {
			internal_buffer[0]=(byte)b;
			source_line.write(internal_buffer,0,1);
		}
	}


	/** Prints debugging information */
	private static void printOut(String str) {
		if (DEBUG) System.err.println("DEBUG: SourceLineAudioOutputStream: "+str);
	}

}
