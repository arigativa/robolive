package robolive.puppet.driver

import com.fazecast.jSerialComm.SerialPort

import java.io.{BufferedReader, InputStreamReader}
import scala.util.Using

final class SerialDriver(serialPort: SerialPort) {
  private val reader =
    new BufferedReader(new InputStreamReader(serialPort.getInputStream))

  def start(baudRate: Int = 9600): Unit = {
    serialPort.setComPortParameters(baudRate, 8, SerialPort.ONE_STOP_BIT, SerialPort.NO_PARITY)
    serialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_BLOCKING, 3000, 3000)
    if (!serialPort.openPort()) {
      throw new RuntimeException("Can't open serial port for some reason ¯\\_(ツ)_/¯")
    }
  }

  def close(): Unit = serialPort.closePort()

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

  implicit val releasable = new Using.Releasable[SerialDriver] {
    def release(resource: SerialDriver): Unit = resource.close()
  }

  def getPorts: Array[SerialPort] = SerialPort.getCommPorts

  def withSerial[T](systemPortName: String)(f: SerialDriver => T): scala.util.Try[T] = {
    scala.util.Try {
      SerialPort.getCommPorts
        .find(_.getSystemPortName.contains(systemPortName))
        .getOrElse(throw new RuntimeException(s"Error: Port `$systemPortName` is not found"))
    }.flatMap { port =>
      Using(new SerialDriver(port)) { driver =>
        driver.start()
        f(driver)
      }
    }
  }
}
