package robolive.puppet.driver

import java.util.concurrent.atomic.AtomicReference

import com.fazecast.jSerialComm.SerialPort
import org.slf4j.Logger

trait PWMController {
  def getDeviceList: Set[String]
  def getDriver(deviceName: String): Option[PWMDriver]
}

object PWMController {
  final class PWMControllerImpl(logger: Logger) extends PWMController {
    private var devices = Map.empty[String, (() => PWMDriver, AtomicReference[PWMDriver])]

    def init(): Unit = {
      val portsMap = SerialPort.getCommPorts.map { port =>
        def serialDriver = SerialDriver.start(port)
        def pwmDriver = new PWMDriver.PWMDriverImpl(serialDriver, logger)
        port.getDescriptivePortName -> (() => pwmDriver, new AtomicReference[PWMDriver]())
      }.toMap
      portsMap.keySet.foreach(logger.info)
      devices = portsMap
    }

    def getDeviceList: Set[String] = {
      devices.keySet
    }

    def getDriver(deviceName: String): Option[PWMDriver] = {
      devices.get(deviceName)
        .map {
          case (startDriver, startedDriverRef) =>
            Option(startedDriverRef.get()) match {
              case Some(startedDriver) => startedDriver
              case None =>
                val started = startDriver()
                startedDriverRef.set(started)
                started
            }
        }
    }
  }

  final class FakePWMController(logger: Logger) extends PWMController {
    def getDeviceList: Set[String] = Set.empty
    def getDriver(deviceName: String): Option[PWMDriver] = {
      Some(new PWMDriver {
        override def reset(): Unit = {
          logger.info(s"$deviceName requested to reset")
        }
        override def setPWM(id: Int, pulseLength: Int): Unit = {
          logger.info(s"$deviceName requested to set pwm $id to $pulseLength")
        }
      })
    }
  }
}
