package robolive.puppet.driver

import com.fazecast.jSerialComm.SerialPort
import java.io.{BufferedReader, InputStreamReader}

final class SerialDriver private (serialPort: SerialPort) {

  private val reader =
    new BufferedReader(new InputStreamReader(serialPort.getInputStream))

  private def start(): Unit = {
    serialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 3000, 3000)
    if (!serialPort.openPort()) {
      throw new RuntimeException("Can't open serial port for some reason ¯\\_(ツ)_/¯")
    }
  }

  def write(s: String): Int = {
    val bytes = s.getBytes("ASCII")
    serialPort.writeBytes(bytes, bytes.length)
  }

  def write(bytes: Array[Byte]): Int = {
    serialPort.writeBytes(bytes, bytes.length)
  }

  def readline(): String = {
    reader.readLine()
  }

  def read(n: Int): Array[Char] = {
    val buf = Array.fill(n)(0.toChar)
    reader.read(buf)
    buf
  }
}

object SerialDriver {
  def start(serialPort: SerialPort): SerialDriver = {
    val driver = new SerialDriver(serialPort)
    driver.start()
    driver
  }
}
