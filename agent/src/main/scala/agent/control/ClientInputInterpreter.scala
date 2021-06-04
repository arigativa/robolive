package agent.control

import agent.control.Command.ControlCommand
import agent.control.driver.{AgentDriver, SerialDriver}
import agent.utils.Hex
import org.slf4j.Logger

import scala.util.{Failure, Success, Try}

trait ClientInputInterpreter {
  def clientInput(input: String): String
}

object ClientInputInterpreter {

  final class ClientInputInterpreterImpl(logger: Logger) extends ClientInputInterpreter {
    import io.circe.parser._

    private val drivers =
      SerialDriver.getPorts.flatMap { port =>
        Try {
          val driver = new SerialDriver(port)
          driver.start()
          Thread.sleep(2000)
          port.getSystemPortName -> driver
        } match {
          case Failure(exception) =>
            logger.warn(
              s"Can't initialize serial driver on port ${port.getSystemPortName}",
              exception
            )
            None
          case Success(value) =>
            logger.info(s"Initialized serial driver on port ${port.getSystemPortName}")
            Some(value)
        }
      }.toMap

    def clientInput(input: String): String = synchronized {
      logger.info(s"Client input received: $input")

      val result = decode[Command](input) match {
        case Right(command) =>
          command match {
            case Command.GetDevices() =>
              SerialDriver.getPorts.map { port =>
                s"""
                   |system port name:      ${port.getSystemPortName}
                   |descriptive port name: ${port.getDescriptivePortName}
                   |port description:      ${port.getPortDescription}
                   |"""
              }.toSeq

            case Command.CommandSequence(commands, deviceName) =>
              drivers.get(deviceName) match {
                case Some(serialDriver) =>
                  val driver = new AgentDriver.AgentDriverImpl(serialDriver, logger)
                  try {
                    commands.map(executeControlCommand(_, driver))
                  } catch {
                    case err: Throwable =>
                      logger.error(s"PWM driver failed to execute $command", err)
                      Seq(err.getMessage)
                  }

                case None =>
                  Seq(
                    s"Device not found: $deviceName, available: ${drivers.keys}"
                  )
              }
          }

        case Left(err) =>
          val errorMessage = s"unexpected user input: ${err.getMessage}"
          logger.warn(errorMessage, err)
          Seq(errorMessage)

      }

      result.mkString("[", ", ", "]")
    }

    private def executeControlCommand(command: ControlCommand, driver: AgentDriver): String = {
      command match {
        case ControlCommand.Reset() =>
          driver.reset()
          "Ok"

        case ControlCommand.SetPWM(pinIndex, pulseLength) =>
          driver.setPWM(pinIndex, pulseLength)
          "Ok"

        case ControlCommand
              .SetPWMEase(pinIndex, startPulseLength, endPulseLength, durationMillis) =>
          var pulseLength = startPulseLength
          val startTime = System.currentTimeMillis().toInt
          val speed = (endPulseLength - startPulseLength) / durationMillis
          while (pulseLength < endPulseLength) {
            driver.setPWM(pinIndex, pulseLength)
            Thread.sleep(1)
            val currentTime = System.currentTimeMillis().toInt
            pulseLength = startPulseLength + Math
              .max(speed * (currentTime - startTime), endPulseLength - startPulseLength)
          }
          "Ok"

        case ControlCommand.StartRoomba() =>
          driver.startRoomba()
          "Started"

        case ControlCommand.Sleep(millis) =>
          Thread.sleep(millis)
          "woke up"

        case ControlCommand.SendToSerial(hexString) =>
          driver.sendToSerial(Hex.decodeBytes(hexString))
          "Ok"
      }
    }
  }

  final class FakeClientInputInterpreter(logger: Logger) extends ClientInputInterpreter {
    def clientInput(input: String): String = {
      logger.info(s"FAKE: Client input received: $input")
      "Ok"
    }
  }

}
