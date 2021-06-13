package agent

import com.fazecast.jSerialComm.SerialPort
import control.driver.SerialDriver
import utils.Hex

import scala.util.Failure

object SerialCliApp extends App {

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
      val result = SerialDriver.withSerial(systemPortName) { serialDriver =>
        Thread.sleep(2000)
        rest match {
          case "-c" :: command :: Nil =>
            val writtenCommand = serialDriver.write(s"$command\n")
            println(s"$writtenCommand < $command\n")

            val response = serialDriver.readline()
            println(s"> $response")

          case "-c" :: command :: "-b" :: hexString :: rest =>
            val toRead = rest match {
              case "-r" :: readBytes :: Nil => Some(readBytes)
              case _ => None
            }

            val bytes = Hex.decodeBytes(hexString)
            val commandWithBodySize = s"$command:${bytes.length}\n"

            val writtenCommand = serialDriver.write(commandWithBodySize)
            println(s"$writtenCommand < $commandWithBodySize")

            val writtenBytes = serialDriver.write(bytes)
            println(s"$writtenBytes < ${bytes.mkString}")

            val response =
              toRead match {
                case Some(readBytes) => serialDriver.read(readBytes.toInt).mkString
                case None => serialDriver.readline()
              }
            println(s"> ${response}")

          case other => printHelp(other)
        }
      }
      result match {
        case Failure(exception) =>
          println(exception)
          exception.printStackTrace()
        case _ =>
      }

    case other => printHelp(other)
  }
}
