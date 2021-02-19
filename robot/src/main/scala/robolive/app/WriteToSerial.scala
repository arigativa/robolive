package robolive.app

import com.fazecast.jSerialComm.SerialPort
import robolive.puppet.driver.SerialDriver
import robolive.utils.Hex

import scala.io.Source

object WriteToSerial extends App {

  private val serialPorts = SerialPort.getCommPorts

  args match {
    case Array("-l") =>
      serialPorts.foreach { port =>
        println(s"""
           |system port name:      ${port.getSystemPortName} 
           |descriptive port name: ${port.getDescriptivePortName} 
           |port description:      ${port.getPortDescription}
           |""".stripMargin)
      }

    case Array("-s", systemPortName, "-c", command) =>
      serialPorts.find(_.getSystemPortName.contains(systemPortName)) match {
        case Some(port) =>
          try {
            port.setBaudRate(9600)
            val serialDriver = SerialDriver.start(port)

            val writtenCommand = serialDriver.write(command + "\n")
            println(s"$writtenCommand < $command\n")

            val response = serialDriver.readline()
            println(s"> $response")
          } catch {
            case e: Throwable => e.printStackTrace()
          } finally {
            port.closePort()
          }
        case None =>
          throw new RuntimeException("Device not found")
      }

    case Array("-s", systemPortName, "-c", command, "-b", bytes, "-r", read) =>
      serialPorts.find(_.getSystemPortName.contains(systemPortName)) match {
        case Some(port) =>
          try {
            port.setBaudRate(9600)
            val serialDriver = SerialDriver.start(port)

            val writtenCommand = serialDriver.write(command + "\n")
            println(s"$writtenCommand < $command\n")

            val byteString = Hex.decodeBytes(bytes)
            val writtenBytes = serialDriver.write(byteString)
            println(s"$writtenBytes < ${byteString.mkString}")

            val response = serialDriver.read(read.toInt)
            println(s"> ${response.mkString}")
          } catch {
            case e: Throwable => e.printStackTrace()
          } finally {
            port.closePort()
          }

        case None =>
          throw new RuntimeException("Device not found")
      }

    case _ => println("""Unknown options, try:
        | -l
        | -s ttyACM1 -c reset
        | -s ttyACM1 -c serial:5 -b FFFFFFFFFF -r 5
        | """.stripMargin)

  }
}
