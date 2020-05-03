package robolive

import io.circe
import org.freedesktop.gstreamer.{Element, GstObject}
import org.freedesktop.gstreamer.webrtc.{WebRTCBin, WebRTCSessionDescription}

object Models {
  import io.circe.{Decoder, Encoder}

  sealed trait Message
  sealed trait InternalMessage extends Message
  sealed trait ExternalMessage extends Message

  object InternalMessage {
    final case class OnNegotiationNeeded(elem: Element, handler: WebRTCBin.CREATE_OFFER)
        extends InternalMessage
    final case class OnIceCandidate(sdpMLineIndex: Int, candidate: String) extends InternalMessage
    final case class OnOfferCreated(offer: WebRTCSessionDescription) extends InternalMessage
    final case class EndOfStream(source: GstObject) extends InternalMessage
    final case class ErrorMessage(source: GstObject, code: Int, message: String)
        extends InternalMessage
  }

  object ExternalMessage {

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

    def toWire(message: ExternalMessage): String = message.asJson.noSpaces

    def fromWire(message: String): Either[circe.Error, ExternalMessage] =
      parse(message).flatMap(_.as[ExternalMessage])

    implicit val encoder: Encoder[ExternalMessage] = deriveConfiguredEncoder
    implicit val decoder: Decoder[ExternalMessage] = deriveConfiguredDecoder

    final case class Sdp(`type`: String, sdp: String) extends ExternalMessage
    object Sdp {
      implicit val encoder: Encoder[Sdp] = deriveConfiguredEncoder
      implicit val decoder: Decoder[Sdp] = deriveConfiguredDecoder
    }

    final case class Ice(candidate: String, sdpMLineIndex: Int) extends ExternalMessage
    object Ice {
      implicit val encoder: Encoder[Ice] = deriveConfiguredEncoder
      implicit val decoder: Decoder[Ice] = deriveConfiguredDecoder
    }
  }
}
