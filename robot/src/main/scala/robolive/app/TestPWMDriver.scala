package robolive.app
import robolive.puppet.driver.{PWMDriver, SerialDriver}

object TestPWMDriver extends App {

  import java.io.{BufferedReader, InputStreamReader}

  import com.fazecast.jSerialComm.SerialPort
  import org.slf4j.{Logger, LoggerFactory}

  val log = LoggerFactory.getLogger("PWMDRIVERTEST")

  val arduinoComPort: SerialPort =
    SerialPort.getCommPorts
      .find(_.getDescriptivePortName.contains(getEnv("PWM_DRIVER_NAME", "NANO")))
      .get

  log.info(
    s"selected port: system-port-name=${arduinoComPort.getSystemPortName} descriptive-port-name=${arduinoComPort.getDescriptivePortName}"
  )

  arduinoComPort.setBaudRate(9600)

  val serialDriver = SerialDriver.start(arduinoComPort)
  val pwmDriver = new PWMDriver.PWMDriverImpl(serialDriver, log)

  log.info(s"isOpen ${arduinoComPort.isOpen}")

  //driver.reset()

  (50 to 500 by 10).foreach { pw =>
    pwmDriver.setPWM(0, pw)
    pwmDriver.setPWM(1, pw)
    pwmDriver.setPWM(2, pw)
    pwmDriver.setPWM(3, pw)
  }

  log.info(s"isOpen ${arduinoComPort.isOpen}")
  log.info("finished, waiting for someone or something to show you the way")

  log.info(s"bytesAvail ${arduinoComPort.bytesAvailable()}")
  Thread.sleep(10000)
  log.info(s"bytesAvail ${arduinoComPort.bytesAvailable()}")
  log.info(s"isOpen ${arduinoComPort.isOpen}")
  log.info("exit")
}
