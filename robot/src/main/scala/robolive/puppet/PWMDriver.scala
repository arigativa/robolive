package robolive.puppet

import java.io.{BufferedReader, InputStreamReader}

import com.fazecast.jSerialComm.SerialPort
import org.slf4j.Logger

class PWMDriver private (serialPort: SerialPort, log: Logger) {
  
    private val reader =
      new BufferedReader(new InputStreamReader(serialPort.getInputStream))

    private def start(): Unit = {
      serialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 3000, 3000)
      if (!serialPort.openPort()) {
        throw new RuntimeException("Can't open serial port for some reason ¯\\_(ツ)_/¯")
      }
    }
  
    private def write(s: String) = {
      val bytes = s.getBytes("ASCII")
      serialPort.writeBytes(bytes, bytes.length)
    }

    private def readline(): String = {
      reader.readLine()
    }

    def reset(): Unit = {
      write("reset\n")
      log.trace(s"reset result: ${readline()}")
    }

    def setPWM(id: Int, pulseLength: Int): Unit = {
      write(s"$id $pulseLength\n")
      log.trace(s"setPWM result: ${readline()}")
    }
  }

object PWMDriver {
  def apply(serialPort: SerialPort, log: Logger): PWMDriver = {
    val driver = new PWMDriver(serialPort, log)
    driver.start()
    driver
  }
}
