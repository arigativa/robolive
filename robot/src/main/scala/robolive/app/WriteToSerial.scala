package robolive.app

import com.fazecast.jSerialComm.SerialPort
import robolive.puppet.driver.SerialDriver
import robolive.utils.Hex

import scala.io.Source

object WriteToSerial extends App {

  private def printHelp(unrecognizedInput: List[String]): Unit = {
    println {
      s"""Unknown options `${unrecognizedInput.mkString(" ")}`, try:
              | -l
              | -s ttyACM1 -c reset
              | -s ttyACM1 -c serial -b FFFFFFFFFF -r 5
              | """.stripMargin
    }
  }

  args.toList match {
    case "-l" :: Nil =>
      SerialPort.getCommPorts.foreach { port =>
        println(s"""
           |system port name:      ${port.getSystemPortName} 
           |descriptive port name: ${port.getDescriptivePortName} 
           |port description:      ${port.getPortDescription}
           |""".stripMargin)
      }

    case "-s" :: systemPortName :: rest =>
      SerialDriver.withSerial(systemPortName) { serialDriver =>
        rest match {
          case "-c" :: command :: Nil =>
            val writtenCommand = serialDriver.write(s"$command\n")
            println(s"$writtenCommand < $command\n")

            val response = serialDriver.readline()
            println(s"> $response")

          case "-c" :: command :: "-b" :: hexString :: "-r" :: readBytes :: Nil =>
            val bytes = Hex.decodeBytes(hexString)
            val commandWithBodySize = s"$command:${bytes.length}\n"

            val writtenCommand = serialDriver.write(commandWithBodySize)
            println(s"$writtenCommand < $commandWithBodySize")

            val writtenBytes = serialDriver.write(bytes)
            println(s"$writtenBytes < ${bytes.mkString}")

            val response = serialDriver.read(readBytes.toInt)
            println(s"> ${response.mkString}")

          case other => printHelp(other)
        }
      }

    case other => printHelp(other)
  }
}
