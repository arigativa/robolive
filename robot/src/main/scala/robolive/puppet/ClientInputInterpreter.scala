package robolive.puppet

import io.circe.Decoder
import io.circe.generic.extras.Configuration
import org.slf4j.Logger
import robolive.puppet.driver.{PWMDriver, SerialDriver}
import robolive.utils.Hex

import java.util.concurrent.ConcurrentHashMap
import scala.util.{Failure, Success, Try}

trait ClientInputInterpreter {
  def clientInput(input: String): String
}

object ClientInputInterpreter {
  final class FakeClientInputInterpreter(logger: Logger) extends ClientInputInterpreter {
    def clientInput(input: String): String = {
      logger.info(s"FAKE: Client input received: $input")
      "Ok"
    }
  }

  final class ClientInputInterpreterImpl(logger: Logger) extends ClientInputInterpreter {
    import io.circe.parser._

    val drivers =
      SerialDriver.getPorts
        .flatMap { port =>
          Try {
            val driver = new SerialDriver(port)
            driver.start()
            Thread.sleep(2000)
            port.getSystemPortName -> driver
          } match {
            case Failure(exception) =>
              logger.warn(s"Can't initialize serial driver on port ${port.getSystemPortName}", exception)
              None
            case Success(value) =>
              logger.info(s"Initialized serial driver on port ${port.getSystemPortName}")
              Some(value)
          }
        }
        .toMap

    def executeCommand(commandSequence: CommandSequence, driver: PWMDriver) = {
      commandSequence.commands.map {
        case Command.Reset() =>
          driver.reset()
          "Ok"

        case Command.SetPWM(pinIndex, pulseLength) =>
          driver.setPWM(pinIndex, pulseLength)
          "Ok"

        case Command.SetPWMEase(pinIndex, startPulseLength, endPulseLength, durationMillis) =>
          var pulseLength = startPulseLength
          val startTime = System.currentTimeMillis().toInt
          val speed = (endPulseLength - startPulseLength) / durationMillis
          while(pulseLength < endPulseLength) {
            driver.setPWM(pinIndex, pulseLength)
            Thread.sleep(1)
            val currentTime = System.currentTimeMillis().toInt
            pulseLength = startPulseLength + Math.max(speed * (currentTime - startTime), endPulseLength-startPulseLength)
          }
          "Ok"

        case Command.StartRoomba() =>
          driver.startRoomba()
          "Started"

        case Command.Sleep(millis) =>
          Thread.sleep(millis)
          "woke up"

        case Command.SendToSerial(hexString) =>
          driver.sendToSerial(Hex.decodeBytes(hexString))
          "Ok"

        case Command.Devices() =>
          SerialDriver.getPorts.map { port =>
            s"""
               |system port name:      ${port.getSystemPortName}
               |descriptive port name: ${port.getDescriptivePortName}
               |port description:      ${port.getPortDescription}
               |"""
          }.mkString("[", ", ", "]")
      }
    }

    def clientInput(input: String): String = synchronized {

      logger.info(s"Client input received: $input")

      val response = decode[CommandSequence](input) match {
        case Right(commandSequence) =>
          drivers.get(commandSequence.deviceName) match {
            case Some(serialDriver) =>
              val driver = new PWMDriver.PWMDriverImpl(serialDriver, logger)
              try {
                executeCommand(commandSequence, driver)
              } catch {
                case err: Throwable =>
                  logger.error(s"PWM driver failed to execute $commandSequence", err)
                  Seq(err.getMessage)
              }
            case None =>
              Seq(s"Device not found: ${commandSequence.deviceName}, available: ${drivers.keys}")
          }

        case Left(err: Throwable) =>
          val errorMessage = s"unexpected user input: ${err.getMessage}"
          logger.warn(errorMessage, err)
          Seq(errorMessage)
      }

      response.mkString("[", ", ", "]")
    }
  }

  import io.circe.generic.extras.semiauto._

  implicit val genDevConfig: Configuration = Configuration.default.withDiscriminator("@type")

  sealed trait Command
  object Command {
    final case class Reset() extends Command
    object Reset {
      implicit val decoder: Decoder[Reset] = deriveConfiguredDecoder
    }
    final case class SetPWM(pinIndex: Int, pulseLength: Int) extends Command
    object SetPWM {
      implicit val decoder: Decoder[SetPWM] = deriveConfiguredDecoder
    }
    final case class SetPWMEase(pinIndex: Int, startPulseLength: Int, endPulseLength: Int, durationMillis: Int) extends Command
    object SetPWMEase {
      implicit val decoder: Decoder[SetPWMEase] = deriveConfiguredDecoder
    }
    final case class SendToSerial(hexString: String) extends Command
    object SendToSerial {
      implicit val decoder: Decoder[SendToSerial] = deriveConfiguredDecoder
    }
    final case class Devices() extends Command
    object Devices {
      implicit val decoder: Decoder[Devices] = deriveConfiguredDecoder
    }
    final case class StartRoomba() extends Command
    object StartRoomba {
      implicit val decoder: Decoder[StartRoomba] = deriveConfiguredDecoder
    }
    final case class Sleep(millis: Int) extends Command
    object Sleep {
      implicit val decoder: Decoder[Sleep] = deriveConfiguredDecoder
    }

    implicit val decoder = deriveConfiguredDecoder[Command]
  }

  final case class CommandSequence(commands: Seq[Command], deviceName: String)
  object CommandSequence {
    implicit val decoder: Decoder[CommandSequence] = deriveConfiguredDecoder
  }

}
