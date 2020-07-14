package sdp

import scala.language.{implicitConversions, postfixOps}

private final class StringParser(raw: String) {
  import StringParser._

  private val Unmatched = -1
  private val Success = -1
  private val EndOfString = -2

  private val iter = raw.charStepper
  private var lastConsumed: Int = Success

  def string(p: ParserPredicate): String = {
    val str = new StringBuilder()
    var c = -1
    while (nonEmpty && { c = charUnsafe(p); c >= 0 }) {
      str.addOne(c.toChar)
    }
    str.toString()
  }

  def char(p: ParserPredicate): Either[ParserError, Char] = {
    val c = charUnsafe(p)
    c match {
      case EndOfString => Left(ParserError.EndOfString)
      case Unmatched => Left(ParserError.UnexpectedChar(lastConsumed.toChar, p.name))
      case matched => Right(matched.toChar)
    }
  }

  private def charUnsafe(p: Char => Boolean): Int = {
    if (lastConsumed == Success) {
      if (iter.hasStep) {
        val c = iter.nextStep()
        if (p(c.toChar)) {
          c
        } else {
          lastConsumed = c
          Unmatched
        }
      } else {
        EndOfString
      }
    } else {
      if (p(lastConsumed.toChar)) {
        val lc = lastConsumed
        lastConsumed = Success
        lc
      } else {
        Unmatched
      }
    }
  }

  def nonEmpty: Boolean = iter.hasStep

  def isEmpty: Boolean = !nonEmpty
}

private object StringParser {
  sealed trait ParserError
  object ParserError {
    case object EndOfString extends ParserError {
      override def toString: String = "End of string"
    }
    final case class UnexpectedChar(unexpectedChar: Char, predicateName: String)
        extends ParserError {
      override def toString: String = s"'$unexpectedChar' not match predicate '$predicateName'"
    }
  }

  sealed trait ParserPredicate extends (Char => Boolean) {
    val name: String
  }
  object ParserPredicate {
    def apply(pName: String)(p: Char => Boolean): ParserPredicate = new ParserPredicate {
      override val name: String = pName
      override def apply(v: Char): Boolean = p(v)
    }

    def apply(p: Char => Boolean): ParserPredicate = new ParserPredicate {
      override val name: String = "unnamed"
      override def apply(v: Char): Boolean = p(v)
    }
  }
}
