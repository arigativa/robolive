package robolive.puppet.driver
import org.slf4j.Logger

trait PWMDriver {
  def reset(): Unit
  def setPWM(id: Int, pulseLength: Int): Unit
  def sendToSerial(bytes: Array[Byte]): Unit
}

object PWMDriver {
  final class PWMDriverImpl(serialDriver: SerialDriver, log: Logger) extends PWMDriver {

    def reset(): Unit = {
      val command = "reset\n"
      sendCommand(command)
    }

    def setPWM(id: Int, pulseLength: Int): Unit = {
      val command = s"$id $pulseLength\n"
      sendCommand(command)
    }

    def sendToSerial(bytes: Array[Byte]): Unit = {
      log.info(s"Writing to serial ${bytes.mkString("[", ",", "]")}")
      serialDriver.write(s"serial:${bytes.length}\n")
      serialDriver.write(bytes)
      log.info("Reading back")
      val response = serialDriver.read(bytes.length)
      log.info(s"Read back: ${response.mkString("[", ",", "]")}")
    }

    private def sendCommand(command: String): Unit = {
      val bytesWritten = serialDriver.write(command)
      val response = serialDriver.readline()
      log.trace(s"Command sent: `$command`; bytes written: `$bytesWritten`; result: $response")
    }
  }

  final class FakePWMDriver extends PWMDriver {
    def reset(): Unit = ()
    def setPWM(id: Int, pulseLength: Int): Unit = ()
    def sendToSerial(bytes: Array[Byte]): Unit = ()
  }
}
