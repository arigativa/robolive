package robolive.puppet
import io.circe.Decoder
import io.circe.generic.extras.Configuration
import org.slf4j.Logger
import robolive.puppet.driver.{PWMDriver, SerialDriver}
import robolive.utils.Hex

import scala.util.{Failure, Success}

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

    def clientInput(input: String): String = synchronized {

      logger.info(s"Client input received: $input")

      val response = decode[CommandSequence](input) match {
        case Right(commandSequence) =>
          SerialDriver.withSerial(commandSequence.deviceName) { serialDriver =>
            val driver = new PWMDriver.PWMDriverImpl(serialDriver, logger)

            try {
              commandSequence.commands.map {
                case Command.Reset() =>
                  driver.reset()
                  "Ok"

                case Command.SetPWM(pinIndex, pulseLength) =>
                  driver.setPWM(pinIndex, pulseLength)
                  "Ok"

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
            } catch {
              case err: Throwable =>
                logger.error(s"PWM driver failed to execute $commandSequence", err)
                Seq(err.getMessage)
            }
          } match {
            case Failure(exception) =>
              logger.error("Error during command evaluation", exception)
              Seq(s"Error during command evaluation: ${exception.getMessage}")

            case Success(response) => response
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
    final case class SendToSerial(hexString: String) extends Command
    object SendToSerial {
      implicit val decoder: Decoder[SendToSerial] = deriveConfiguredDecoder
    }
    final case class Devices() extends Command
    object Devices {
      implicit val decoder: Decoder[Devices] = deriveConfiguredDecoder
    }
    implicit val decoder = deriveConfiguredDecoder[Command]
  }

  final case class CommandSequence(commands: Seq[Command], deviceName: String)
  object CommandSequence {
    implicit val decoder: Decoder[CommandSequence] = deriveConfiguredDecoder
  }

}
