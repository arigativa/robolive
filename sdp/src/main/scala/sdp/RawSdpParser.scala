package sdp

import scala.annotation.tailrec

private object RawSdpParser {
  import StringParser._

  final case class RawSdpAttribute(attr: Char, value: String)

  private val isLetter = ParserPredicate("isLetter")(_.isLetter)
  private val isEqualSign = ParserPredicate("isEqualSign")(_ == '=')
  private val isNotNewLine = ParserPredicate("isNotNewLine")(_ != '\n')
  private val isNewLine = ParserPredicate("isNotNewLine")(_ == '\n')

  private def chopCR(value: String): String = {
    if (value.last == '\r') {
      value.substring(0, value.length - 1)
    } else {
      value
    }
  }

  def parse(rawSdp: String): Either[ParserError, Vector[RawSdpAttribute]] = {
    val parser = new StringParser(rawSdp)
    @tailrec
    def go(
      rawSdpAttributes: Vector[RawSdpAttribute]
    ): Either[ParserError, Vector[RawSdpAttribute]] = {
      val res = for {
        attr <- parser.char(isLetter)
        _ = parser.char(isEqualSign)
        value = parser.string(isNotNewLine)
        _ = parser.char(isNewLine)
      } yield {
        RawSdpAttribute(attr, chopCR(value))
      }
      res match {
        case Right(rawSdp) => go(rawSdpAttributes :+ rawSdp)
        case Left(ParserError.EndOfString) => Right(rawSdpAttributes)
        case Left(error) => Left(error)
      }
    }
    go(Vector.empty)
  }
}
