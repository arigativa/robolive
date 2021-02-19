package robolive.app

import com.fazecast.jSerialComm.SerialPort
import robolive.puppet.driver.SerialDriver

import scala.io.Source

object WriteToSerial extends App {

  args match {
    case Array("-s", systemPortName) =>
      SerialPort.getCommPorts.find(_.getSystemPortName.contains(systemPortName)) match {
        case Some(port) =>
          port.setBaudRate(9600)
          if (!port.openPort()) {
            throw new RuntimeException("Can't open serial port")
          }
          Source.stdin.getLines.foreach { line =>
            println(s"> $line")
            val bytes = (line + "\n").getBytes
            port.writeBytes(bytes, bytes.length)
          }
          val output = Array.fill(256)(0.toByte)
          try {
            port.readBytes(output, 256)
          } catch {
            case er: Throwable => er.printStackTrace()
          }
          println("=========================")
          println(output.mkString)
        case None =>
          throw new RuntimeException("Device not found")
      }
  }
}
