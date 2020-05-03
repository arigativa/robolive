package robolive

import io.circe
import io.circe.{Decoder, Encoder}

sealed trait Message

object Message {

  import io.circe.generic.extras.Configuration
  import io.circe.generic.extras.semiauto._

  private implicit val customConfig: Configuration = {
    val lowerFirstCharacter = (s: String) => s.head.toLower + s.substring(1)
    val default = Configuration.default
    default.copy(transformConstructorNames =
      default.transformConstructorNames.andThen(lowerFirstCharacter)
    )
  }

  import io.circe.parser._
  import io.circe.syntax._

  def toWire(message: Message): String = message.asJson.noSpaces

  def fromWire(message: String): Either[circe.Error, Message] =
    parse(message).flatMap(_.as[Message])

  implicit val encoder: Encoder[Message] = deriveConfiguredEncoder
  implicit val decoder: Decoder[Message] = deriveConfiguredDecoder

  final case class Sdp(`type`: String, sdp: String) extends Message
  object Sdp {
    implicit val encoder: Encoder[Sdp] = deriveConfiguredEncoder
    implicit val decoder: Decoder[Sdp] = deriveConfiguredDecoder
  }

  final case class Ice(candidate: String, sdpMLineIndex: Int) extends Message
  object Ice {
    implicit val encoder: Encoder[Ice] = deriveConfiguredEncoder
    implicit val decoder: Decoder[Ice] = deriveConfiguredDecoder
  }
}
