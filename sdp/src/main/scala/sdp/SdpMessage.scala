package sdp

import SdpMessage._

final case class SdpMessage(
  sessionDescription: SessionDescription,
  media: Seq[Media],
) {
  private val attributeMap = sessionDescription.a.groupBy(attr => attr.name)
  private val mediaMap = media.map(m => m.m.media -> m).toMap

  def findAttributes(name: String): Seq[SdpAttribute] = {
    attributeMap.get(name).toSeq.flatten
  }

  def findMedia(name: String): Option[Media] = {
    mediaMap.get(name)
  }

  def toSdpString: String = {
    val mediasStr = media.map(_.toSdpString).mkString(System.lineSeparator())
    s"""${sessionDescription.toSdpString}
       |$mediasStr""".stripMargin
  }
}

object SdpMessage {
  sealed trait SdpString {
    def toSdpString: String
  }
  sealed trait SdpField extends SdpString
  final case class ProtocolVersion(version: Int) extends SdpField {
    override def toSdpString: String = s"v=$version"
  }
  sealed trait NetworkType extends SdpString
  object NetworkType {
    def fromString(value: String): Option[NetworkType] = {
      if (value == "IN") Some(Internet) else None
    }
    case object Internet extends NetworkType {
      override def toSdpString: String = "IN"
    }
  }

  sealed trait AddressType extends SdpString
  object AddressType {
    def fromString(value: String): Option[AddressType] = {
      value match {
        case "IP4" => Some(IP4)
        case "IP6" => Some(IP6)
        case _ => None
      }
    }

    case object IP4 extends AddressType {
      override def toSdpString: String = "IP4"
    }
    case object IP6 extends AddressType {
      override def toSdpString: String = "IP6"
    }
  }

  final case class Origin(
    userName: String,
    sessId: String,
    sessVersion: Int,
    netType: NetworkType,
    addrType: AddressType,
    unicastAddress: String,
  ) extends SdpField {
    override def toSdpString: String =
      s"o=$userName $sessId $sessVersion ${netType.toSdpString} ${addrType.toSdpString} $unicastAddress"
  }

  final case class SessionName(name: String) extends SdpField {
    override def toSdpString: String = s"s=$name"
  }
  final case class SessionInformation(sessionDescription: String) extends SdpField {
    override def toSdpString: String = s"i=$sessionDescription"
  }
  final case class Uri(value: String) extends SdpField {
    override def toSdpString: String = s"u=$value"
  }
  final case class EmailAddress(email: String) extends SdpField {
    override def toSdpString: String = s"e=$email"
  }
  final case class PhoneNumber(number: String) extends SdpField {
    override def toSdpString: String = s"p=$number"
  }
  final case class ConnectionData(
    netType: NetworkType,
    addrType: AddressType,
    connectionAddress: String,
  ) extends SdpField {
    override def toSdpString: String =
      s"c=${netType.toSdpString} ${addrType.toSdpString} $connectionAddress"
  }

  object BandWidth {
    sealed trait BandWidthType extends SdpString
    object BandWidthType {
      def fromString(value: String): Option[BandWidthType] = {
        value match {
          case "CT" => Some(ConferenceTotal)
          case "AS" => Some(ApplicationSpecific)
          case other =>
            if (other.startsWith("X-")) Some(Experimental(other)) else None
        }
      }
      case object ConferenceTotal extends BandWidthType {
        override def toSdpString: String = "CT"
      }
      case object ApplicationSpecific extends BandWidthType {
        override def toSdpString: String = "AS"
      }

      final case class Experimental(name: String) extends BandWidthType {
        override def toSdpString: String = name
      }
    }
  }
  final case class BandWidth(bwType: BandWidth.BandWidthType, bandwidth: Int) extends SdpField {
    override def toSdpString: String = s"b=${bwType.toSdpString}:$bandwidth"
  }
  final case class Timing(startTime: Int, stopTime: Int) extends SdpField {
    override def toSdpString: String = s"t=$startTime $stopTime"
  }
  final case class RepeatTimes(
    repeatInterval: String,
    activeDuration: String,
    offsetsFromStartTime: Seq[String],
  ) extends SdpField {
    override def toSdpString: String = {
      s"r=$repeatInterval $activeDuration ${offsetsFromStartTime.mkString(" ")}"
    }
  }

  final case class TimeZones(zones: Seq[TimeZones.TimeZone]) extends SdpField {
    override def toSdpString: String = s"z=${zones.map(_.toSdpString).mkString(" ")}"
  }
  object TimeZones {
    final case class TimeZone(
      adjustmentTime: Long,
      offset: String,
    ) extends SdpString {
      override def toSdpString: String = s"$adjustmentTime $offset"
    }
  }

  final case class EncryptionKey(method: String, encryptionKey: Option[String]) extends SdpField {
    override def toSdpString: String = s"k=$method${encryptionKey.map(k => s":$k").getOrElse("")}"
  }
  final case class MediaDescription(
    media: String,
    port: MediaDescription.Port,
    protocol: String,
    formatDescription: Seq[Int],
  ) extends SdpField {
    override def toSdpString: String =
      s"m=$media ${port.toSdpString} $protocol ${formatDescription.mkString(" ")}"
  }

  object MediaDescription {
    final case class Port(port: Int, numberOfPorts: Option[Int]) extends SdpString {
      override def toSdpString: String = s"$port${numberOfPorts.map(n => s"/$n").getOrElse("")}"
    }
  }

  trait AttributeValueDecoder[T] {
    def decode(value: Option[String]): Either[String, T]
  }

  object AttributeValueDecoder {
    def attributeIsEmptyMessage(name: String) =
      s"Fail to parse attribute '$name'. Attribute value is empty"
    def failToParseAttributeMessage(name: String, value: String) =
      s"Fail to parse attribute '$name:$value'"
    def fromValue[T](value: T): AttributeValueDecoder[T] = (v: Option[String]) => Right(value)
    def nonEmpty[T](name: String)(c: String => T): AttributeValueDecoder[T] = {
      case Some(value) => Right(c(value))
      case None => Left(attributeIsEmptyMessage(name))
    }
    def fromFuncNonEmpty[T](
      name: String
    )(c: String => Either[String, T]): AttributeValueDecoder[T] = {
      case Some(value) => c(value)
      case None => Left(attributeIsEmptyMessage(name))
    }
  }

  sealed trait SdpAttribute extends SdpField {
    val name: String
    val valueOpt: Option[String]
    def as[T: AttributeValueDecoder]: Either[String, T] =
      implicitly[AttributeValueDecoder[T]].decode(valueOpt)
  }
  final case class RawBinaryAttribute(name: String) extends SdpAttribute {
    override val valueOpt: Option[String] = None
    override def toSdpString: String = s"a=$name"
  }
  final case class RawValueAttribute(name: String, value: String) extends SdpAttribute {
    override val valueOpt: Option[String] = Some(value)
    override def toSdpString: String = s"a=$name:$value"
  }

  final case class SessionDescription(
    v: ProtocolVersion,
    o: Origin,
    s: SessionName,
    i: Option[SessionInformation],
    u: Option[Uri],
    e: Option[EmailAddress],
    p: Option[PhoneNumber],
    c: Option[ConnectionData],
    b: Seq[BandWidth],
    timeDescriptions: Seq[TimeDescription],
    z: Option[TimeZones],
    k: Option[EncryptionKey],
    a: Seq[SdpAttribute],
  ) extends SdpString {
    override def toSdpString: String = {
      (Seq(
        v.toSdpString,
        o.toSdpString,
        s.toSdpString,
      ) ++
        Seq(
          i.map(_.toSdpString),
          u.map(_.toSdpString),
          e.map(_.toSdpString),
          p.map(_.toSdpString),
          c.map(_.toSdpString),
        ).flatten ++
        b.map(_.toSdpString) ++
        timeDescriptions.map(_.toSdpString) ++
        Seq(z.map(_.toSdpString), k.map(_.toSdpString)).flatten ++
        a.map(_.toSdpString)).mkString(System.lineSeparator())
    }
  }

  final case class TimeDescription(t: Timing, r: Seq[RepeatTimes]) extends SdpString {
    override def toSdpString: String = {
      (t.toSdpString +: r.map(_.toSdpString)).mkString(System.lineSeparator())
    }
  }

  final case class Media(
    m: MediaDescription,
    i: Option[SessionInformation],
    c: Option[ConnectionData],
    b: Seq[BandWidth],
    k: Option[EncryptionKey],
    a: Seq[SdpAttribute]
  ) extends SdpString {
    private val attributeMap = a.groupBy(attr => attr.name)

    def findAttributes(name: String): Seq[SdpAttribute] = {
      attributeMap.get(name).toSeq.flatten
    }

    override def toSdpString: String = {
      (Seq(i.map(_.toSdpString), c.map(_.toSdpString)).flatten.prepended(m.toSdpString) ++
        b.map(_.toSdpString) ++
        k.map(_.toSdpString) ++
        a.map(_.toSdpString)).mkString(System.lineSeparator())
    }
  }

  def apply(rawSdp: String): Either[Seq[String], SdpMessage] = {
    RawSdpParser.parse(rawSdp) match {
      case Left(value) => Left(Vector(s"Error: $value"))
      case Right(value) =>
        val sdpFields = value.map(RawSdpInterpreter.interpret)
        val success = sdpFields.collect { case Right(value) => value }
        if (success.size != sdpFields.size) {
          val failure = sdpFields.collect { case Left(value) => value }
          Left(failure)
        } else {
          import StructureParser.EitherParseOps

          val parser = new StructureParser(success)
          val sdp =
            for {
              v <- parser.next[ProtocolVersion]
              o <- parser.next[Origin]
              s <- parser.next[SessionName]
              i <- parser.next[SessionInformation].optional
              u <- parser.next[Uri].optional
              e <- parser.next[EmailAddress].optional
              p <- parser.next[PhoneNumber].optional
              c <- parser.next[ConnectionData].optional
              b <- parser.seq[BandWidth]
              timeDescriptions <- parser.seq {
                for {
                  t <- parser.next[Timing]
                  rt <- parser.seq[RepeatTimes]
                } yield {
                  TimeDescription(t, rt)
                }
              }
              z <- parser.next[TimeZones].optional
              k <- parser.next[EncryptionKey].optional
              a <- parser.seq[SdpAttribute]
              medias <- parser.seq {
                for {
                  m <- parser.next[MediaDescription]
                  i <- parser.next[SessionInformation].optional
                  c <- parser.next[ConnectionData].optional
                  b <- parser.seq[BandWidth]
                  k <- parser.next[EncryptionKey].optional
                  a <- parser.seq[SdpAttribute]
                } yield {
                  Media(m, i, c, b, k, a)
                }
              }
            } yield {
              SdpMessage(
                sessionDescription =
                  SessionDescription(v, o, s, i, u, e, p, c, b, timeDescriptions, z, k, a),
                media = medias
              )
            }
          val connectionDefined = (sdp: SdpMessage) => {
            sdp.sessionDescription.c.isDefined || sdp.media.forall(_.c.isDefined)
          }
          val connectionIsNotDefinedError =
            "Connection is not defined either on session level, or in all media"
          sdp
            .filterOrElse(connectionDefined, connectionIsNotDefinedError)
            .left
            .map(Vector(_))
        }
    }
  }
}
