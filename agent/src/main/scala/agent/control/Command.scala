package agent.control

import io.circe.Decoder
import io.circe.generic.extras.Configuration
import io.circe.generic.extras.semiauto.deriveConfiguredDecoder

sealed trait Command

object Command {
  private implicit val genDevConfig: Configuration =
    Configuration.default.withDiscriminator("@type")

  sealed trait ControlCommand

  object ControlCommand {
    final case class Reset() extends ControlCommand
    object Reset {
      implicit val decoder: Decoder[Reset] = deriveConfiguredDecoder
    }

    final case class SetPWM(pinIndex: Int, pulseLength: Int) extends ControlCommand
    object SetPWM {
      implicit val decoder: Decoder[SetPWM] = deriveConfiguredDecoder
    }

    final case class SetPWMEase(
      pinIndex: Int,
      startPulseLength: Int,
      endPulseLength: Int,
      durationMillis: Int
    ) extends ControlCommand
    object SetPWMEase {
      implicit val decoder: Decoder[SetPWMEase] = deriveConfiguredDecoder
    }

    final case class SendToSerial(hexString: String) extends ControlCommand
    object SendToSerial {
      implicit val decoder: Decoder[SendToSerial] = deriveConfiguredDecoder
    }

    final case class Devices() extends ControlCommand
    object Devices {
      implicit val decoder: Decoder[Devices] = deriveConfiguredDecoder
    }

    final case class StartRoomba() extends ControlCommand
    object StartRoomba {
      implicit val decoder: Decoder[StartRoomba] = deriveConfiguredDecoder
    }

    final case class Sleep(millis: Int) extends ControlCommand
    object Sleep {
      implicit val decoder: Decoder[Sleep] = deriveConfiguredDecoder
    }

    implicit val decoder = deriveConfiguredDecoder[ControlCommand]
  }

  final case class GetDevices() extends Command
  object GetDevices {
    implicit val decoder: Decoder[GetDevices] = deriveConfiguredDecoder
  }

  final case class CommandSequence(
    commands: Seq[ControlCommand],
    deviceName: String,
  ) extends Command
  object CommandSequence {
    implicit val decoder: Decoder[CommandSequence] = deriveConfiguredDecoder
  }

  implicit val decoder: Decoder[Command] = deriveConfiguredDecoder
}
