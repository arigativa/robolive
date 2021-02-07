package robolive.puppet.driver
import org.slf4j.Logger

trait PWMDriver {
  def reset(): Unit
  def setPWM(id: Int, pulseLength: Int): Unit
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

    private def sendCommand(command: String): Unit = {
      val bytesWritten = serialDriver.write(command)
      val response = serialDriver.readline()
      log.trace(s"Command sent: `$command`; bytes written: `$bytesWritten`; result: $response")
    }
  }

  final class FakePWMDriver extends PWMDriver {
    def reset(): Unit = ()
    def setPWM(id: Int, pulseLength: Int): Unit = ()
  }
}
