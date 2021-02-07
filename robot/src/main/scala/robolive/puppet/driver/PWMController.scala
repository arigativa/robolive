package robolive.puppet.driver

import com.fazecast.jSerialComm.SerialPort
import org.slf4j.Logger

trait PWMController {
  def getDeviceList: Set[String]
  def getDriver(deviceName: String): Option[PWMDriver]
}

object PWMController {
  final class PWMControllerImpl(logger: Logger) extends PWMController {
    private var devices = Map.empty[String, PWMDriver]

    def init(): Unit = {
      val portsMap = SerialPort.getCommPorts.map { port =>
        val serialDriver = SerialDriver.start(port)
        val pwmDriver = new PWMDriver.PWMDriverImpl(serialDriver, logger)
        port.getDescriptivePortName -> pwmDriver
      }.toMap
      devices = portsMap
    }

    def getDeviceList: Set[String] = {
      devices.keySet
    }

    def getDriver(deviceName: String): Option[PWMDriver] = {
      devices.get(deviceName)
    }
  }

  final class FakePWMController extends PWMController {
    def getDeviceList: Set[String] = Set.empty
    def getDriver(deviceName: String): Option[PWMDriver] = None
  }
}
