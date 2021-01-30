package robolive.app

import com.fazecast.jSerialComm.SerialPort

object ListSerialDevices extends App {
  SerialPort.getCommPorts.foreach { port =>
    println(s"${port.getSystemPortName} / ${port.getDescriptivePortName} / ${port.getPortDescription}")
  }
}
