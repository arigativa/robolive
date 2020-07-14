package sdp

import SdpMessage.AttributeValueDecoder

object Attributes {
  final case object ReceiveOnly {
    implicit val decoder = AttributeValueDecoder.fromValue(ReceiveOnly)
  }
  final case object SendReceive {
    implicit val decoder = AttributeValueDecoder.fromValue(SendReceive)
  }
  final case object SendOnly {
    implicit val decoder = AttributeValueDecoder.fromValue(SendOnly)
    final case object Inactive {
      implicit val decoder = AttributeValueDecoder.fromValue(Inactive)
    }
  }
  final case class CategoryAttribute(category: String)
  object CategoryAttribute {
    implicit val decoder = AttributeValueDecoder.nonEmpty("cat")(CategoryAttribute.apply)
  }
  final case class KeywordsAttribute(keywords: String)
  object KeywordsAttribute {
    implicit val decoder = AttributeValueDecoder.nonEmpty("keywds")(KeywordsAttribute.apply)
  }
  final case class ToolAttribute(nameAndVersion: String)
  object ToolAttribute {
    implicit val decoder = AttributeValueDecoder.nonEmpty("tool")(ToolAttribute.apply)
  }
  final case class PacketTimeAttribute(packetTime: Long)
  object PacketTimeAttribute {
    implicit val decoder: AttributeValueDecoder[PacketTimeAttribute] =
      AttributeValueDecoder.fromFuncNonEmpty("ptime") { value =>
        value.toLongOption
          .map(PacketTimeAttribute.apply)
          .toRight(AttributeValueDecoder.failToParseAttributeMessage("ptime", value))
      }
  }

  final case class MaxPacketTime(maximumPacketTime: Long)
  object MaxPacketTime {
    implicit val decoder: AttributeValueDecoder[MaxPacketTime] = {
      AttributeValueDecoder.fromFuncNonEmpty("maxptime") { value =>
        value.toLongOption
          .map(MaxPacketTime.apply)
          .toRight(AttributeValueDecoder.failToParseAttributeMessage("maxptime", value))
      }
    }
  }
  final case class RtpMap(
    payloadType: String,
    encodingName: String,
    clockRate: Int,
    encodingParameters: Seq[String],
  )
  object RtpMap {
    implicit val decoder = AttributeValueDecoder.fromFuncNonEmpty("rtpmap") { value =>
      val rtpMapRaw = value.split(" ")
      if (rtpMapRaw.size == 2) {
        val encodingRaw = rtpMapRaw(1).split("/")
        if (encodingRaw.size >= 2) {
          val payloadType = rtpMapRaw(0)
          val encodingName = encodingRaw(0)
          val clockRate = encodingRaw(1).toIntOption.toRight(
            AttributeValueDecoder.failToParseAttributeMessage("rtpmap", encodingRaw(1))
          )
          val params = encodingRaw.slice(2, encodingRaw.size).toSeq
          clockRate.map(RtpMap(payloadType, encodingName, _, params))
        } else {
          Left(AttributeValueDecoder.failToParseAttributeMessage("rtpmap", rtpMapRaw(1)))
        }
      } else {
        Left(AttributeValueDecoder.failToParseAttributeMessage("rtpmap", value))
      }
    }
  }
  final case class Orientation(orientation: String)
  object Orientation {
    implicit val decoder = AttributeValueDecoder.nonEmpty("orient")(Orientation.apply)
  }
  final case class ConferenceType(conferenceType: String)
  object ConferenceType {
    implicit val decoder = AttributeValueDecoder.nonEmpty("type")(ConferenceType.apply)
  }
  final case class Charset(characterSet: String)
  object Charset {
    implicit val decoder = AttributeValueDecoder.nonEmpty("charset")(Charset.apply)
  }
  final case class SdpLanguage(sdpLanguage: String)
  object SdpLanguage {
    implicit val decoder = AttributeValueDecoder.nonEmpty("sdplang")(SdpLanguage.apply)
  }
  final case class DefaultLanguage(languageTag: String)
  object DefaultLanguage {
    implicit val decoder = AttributeValueDecoder.nonEmpty("lang")(DefaultLanguage.apply)
  }
  final case class FrameRate(frameRate: Double)
  object FrameRate {
    implicit val decoder = AttributeValueDecoder.fromFuncNonEmpty("framerate") { value =>
      value.toDoubleOption
        .map(FrameRate.apply)
        .toRight(AttributeValueDecoder.failToParseAttributeMessage("rtpmap", value))
    }
  }
  final case class Quality(quality: Int)
  object Quality {
    implicit val decoder = AttributeValueDecoder.fromFuncNonEmpty("framerate") { value =>
      value.toIntOption
        .map(Quality.apply)
        .toRight(AttributeValueDecoder.failToParseAttributeMessage("quality", value))
    }
  }
  final case class FormatSpecificParameters(format: String, formatSpecificParameters: String)
  object FormatSpecificParameters {
    implicit val decoder = AttributeValueDecoder.fromFuncNonEmpty("framerate") { value =>
      val fmtpRaw = value.split(" ")
      if (fmtpRaw.size == 2) {
        Right(FormatSpecificParameters(fmtpRaw(0), fmtpRaw(1)))
      } else {
        Left(AttributeValueDecoder.failToParseAttributeMessage("fmtp", value))
      }
    }
  }
}
