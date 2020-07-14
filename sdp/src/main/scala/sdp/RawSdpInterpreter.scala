package sdp

import SdpMessage.TimeZones.TimeZone
import SdpMessage.{
  AddressType,
  BandWidth,
  ConnectionData,
  EmailAddress,
  EncryptionKey,
  MediaDescription,
  NetworkType,
  Origin,
  PhoneNumber,
  ProtocolVersion,
  RawBinaryAttribute,
  RawValueAttribute,
  RepeatTimes,
  SdpField,
  SessionInformation,
  SessionName,
  TimeZones,
  Timing,
  Uri
}

private object RawSdpInterpreter {
  def interpret(rawSdp: RawSdpParser.RawSdpAttribute): Either[String, SdpField] = {
    val RawSdpParser.RawSdpAttribute(attr, value) = rawSdp
    attr match {
      case 'v' =>
        value.toIntOption
          .map(ProtocolVersion.apply)
          .toRight("v: can not parse protocol version")
      case 'o' =>
        val originatorValueArray = value.split(" ")
        if (originatorValueArray.size == 6) {
          for {
            sessVersion <- originatorValueArray(2).toIntOption
              .toRight(s"o: can not parse sessVersion '${originatorValueArray(2)}'")
            netType <- NetworkType
              .fromString(originatorValueArray(3))
              .toRight(s"o: can not parse netType: '${originatorValueArray(3)}'")
            addrType <- AddressType
              .fromString(originatorValueArray(4))
              .toRight(s"o: can not parse addrType: '${originatorValueArray(4)}'")
          } yield {
            Origin(
              userName = originatorValueArray(0),
              sessId = originatorValueArray(1),
              sessVersion = sessVersion,
              netType = netType,
              addrType = addrType,
              unicastAddress = originatorValueArray(5),
            )
          }
        } else {
          Left(
            s"o: can not parse origin value: '$value', expected: '<username> <sess-id> <sess-version> <nettype> <addrtype> <unicast-address>'"
          )
        }
      case 's' => Right(SessionName(value))
      case 'i' => Right(SessionInformation(value))
      case 'u' => Right(Uri(value))
      case 'e' => Right(EmailAddress(value))
      case 'p' => Right(PhoneNumber(value))
      case 'c' =>
        val connectionData = value.split(" ")
        if (connectionData.size == 3) {
          for {
            netType <- NetworkType
              .fromString(connectionData(0))
              .toRight(s"o: can not parse netType: '${connectionData(0)}'")
            addrType <- AddressType
              .fromString(connectionData(1))
              .toRight(s"o: can not parse addrType: '${connectionData(1)}'")
          } yield {
            val connectionAddress = connectionData(2)
            ConnectionData(netType, addrType, connectionAddress)
          }
        } else {
          Left(
            s"c: can not parse connection data value: '$value', expected: '<nettype> <addrtype> <connection-address>'"
          )
        }
      case 'b' =>
        val bandwidth = value.split(":")
        if (bandwidth.size == 2) {
          for {
            t <- BandWidth.BandWidthType
              .fromString(bandwidth(0))
              .toRight(s"b: can not parse bwtype: '${bandwidth(0)}'")
            w <- bandwidth(1).toIntOption.toRight(s"b: can not parse bandwidth: '${bandwidth(1)}'")
          } yield {
            BandWidth(t, w)
          }
        } else {
          Left(s"b: can not parse bandwidth value: '$value', expected: '<bwtype>:<bandwidth>'")
        }
      case 't' =>
        val timing = value.split(" ")
        if (timing.size == 2) {
          for {
            startTime <- timing(0).toIntOption
              .toRight(s"t: can not parse startTime: '${timing(0)}'")
            stopTime <- timing(1).toIntOption.toRight(s"t: can not parse stopTime: '${timing(1)}'")
          } yield {
            Timing(startTime, stopTime)
          }
        } else {
          Left(s"t: can not parse timing value: '$value', expected: '<start-time> <stop-time>'")
        }
      case 'r' =>
        val repeatIntervals = value.split(" ")
        if (repeatIntervals.size > 2) {
          val repeatInterval = repeatIntervals(0)
          val activeDuration = repeatIntervals(1)
          val offsetsFromStartTime = repeatIntervals.slice(2, repeatIntervals.size)
          Right(RepeatTimes(repeatInterval, activeDuration, offsetsFromStartTime))
        } else {
          Left(
            s"r: can not parse repeat intervals value: '$value', expected: '<repeat interval> <active duration> <offsets from start-time>'"
          )
        }
      case 'z' =>
        val timeZones = value.split(" ")
        if (timeZones.size % 2 == 0) {
          val parsedTimeZones = timeZones.grouped(2).map { timeZone =>
            val adjustmentTime = timeZone(0).toLongOption
              .toRight(s"z: can not parse adjustmentTime value: '${timeZone(0)}'")
            val offset = timeZone(1)
            adjustmentTime.map(TimeZone(_, offset))
          }
          val parsedTimeZonesSuccess = parsedTimeZones.collect { case Right(value) => value }
          if (parsedTimeZonesSuccess.size != parsedTimeZones.size) {
            Left {
              parsedTimeZones.collect { case Left(error) => error }
                .mkString(System.lineSeparator())
            }
          } else {
            Right(TimeZones(parsedTimeZonesSuccess.toSeq))
          }
        } else {
          Left(
            s"z: can not parse time zones values: '$value', expected: '<adjustment time> <offset> ...'"
          )
        }
      case 'k' =>
        val encryptionKey = value.split(":")
        if (encryptionKey.nonEmpty) {
          val method = encryptionKey(0)
          val key = if (encryptionKey.size == 2) Some(encryptionKey(1)) else None
          Right(EncryptionKey(method, key))
        } else {
          Left(
            s"k: empty encryption keys, expected: '<method>:<encryption key>?'"
          )
        }
      case 'm' =>
        val medias = value.split(" ")
        if (medias.size >= 4) {
          val formats = medias
            .slice(3, medias.size)
            .map(fmt => fmt.toIntOption.toRight(s"m: can not parse fmt value: '$fmt'"))

          val formatsSuccess = formats.collect { case Right(value) => value }
          if (formatsSuccess.length != formats.length) {
            val formatsErrors = formats.collect { case Left(error) => error }
            Left(formatsErrors.mkString(System.lineSeparator()))
          } else {
            val portRaw = medias(1)
            val portToNumberOfPorts = portRaw.split("/")
            val port =
              if (portToNumberOfPorts.length == 2) {
                for {
                  port <- portToNumberOfPorts(0).toIntOption
                  numOfPorts <- portToNumberOfPorts(1).toIntOption
                } yield {
                  MediaDescription.Port(port, Some(numOfPorts))
                }
              } else if (portToNumberOfPorts.length == 1) {
                portToNumberOfPorts(0).toIntOption.map(MediaDescription.Port(_, None))
              } else {
                None
              }
            port
              .toRight(s"m: can not parse port value: '${medias(1)}'")
              .map { port =>
                val media = medias(0)
                val protocol = medias(2)
                MediaDescription(media, port, protocol, formatsSuccess)
              }
          }
        } else {
          Left(
            s"m: can not parse media value: '$value', expected: '<media> <port> <proto> <fmt> ...'"
          )
        }
      case 'a' =>
        val attr = value.split(":")
        if (attr.size == 1) {
          Right(RawBinaryAttribute(attr(0)))
        } else if (attr.size > 1) {
          Right(RawValueAttribute(attr(0), value.substring(value.indexOf(':') + 1)))
        } else {
          Left(s"Can not parse attribute value: $value")
        }
    }
  }
}
