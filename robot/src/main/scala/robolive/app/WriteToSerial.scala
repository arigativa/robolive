package robolive.app

import com.fazecast.jSerialComm.SerialPort
import robolive.puppet.driver.SerialDriver
import robolive.utils.Hex

import scala.io.Source
import scala.util.{Failure, Success, Try}

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
          case "-t" :: _ =>

            serialDriver.write("first\n")
            println(s"${Try(serialDriver.readline())}")
            serialDriver.write("second\n")
            println(s"${Try(serialDriver.readline())}")
            serialDriver.write("third\n")
            println(s"${Try(serialDriver.readline())}")
            serialDriver.write("forth\n")
            println(s"${Try(serialDriver.readline())}")

          case "-c" :: command :: Nil =>
//            println(s"initial readline ${Try(serialDriver.readline())}")

            for {
              i <- 0 to 10
            } {
              val writtenCommand = serialDriver.write(s"$command\n")
              println(s"$writtenCommand < $command\n")

              val response = List(Try(serialDriver.readline()), Try(serialDriver.readline()))
              println(s"> $response")
            }

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
      } match {
        case Failure(exception) =>
          println(exception.getMessage)
          exception.printStackTrace()
          sys.exit(-1)
        case _ =>
      }

    case other => printHelp(other)
  }
}
