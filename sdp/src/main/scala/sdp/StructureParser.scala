package sdp

import sdp.StructureParser.{failF, ParseResult}

import scala.collection.mutable
import scala.language.implicitConversions
import scala.reflect.{classTag, ClassTag}

private final class StructureParser[U](fields: Seq[U]) {
  import ParseResult._

  private val iter = fields.iterator
  private var unmatched: Option[U] = None

  private def next_[T <: U: ClassTag]: ParseResult[T] = {
    val expected = classTag[T].runtimeClass.getCanonicalName
    unmatched match {
      case Some(value) =>
        if (classTag[T].runtimeClass.isAssignableFrom(value.getClass)) {
          unmatched = None
          Found(value.asInstanceOf[T])
        } else {
          Unexpected(expected, value)
        }
      case None =>
        if (iter.hasNext) {
          val temp = iter.next()
          if (classTag[T].runtimeClass.isAssignableFrom(temp.getClass)) {
            Found(temp.asInstanceOf[T])
          } else {
            unmatched = Some(temp)
            Unexpected(expected, temp)
          }
        } else {
          Empty(expected)
        }
    }
  }

  def next[T <: U: ClassTag]: Either[String, T] = {
    next_[T] match {
      case ParseResult.Empty(expected) => Left(failF(expected, "End of stream"))
      case ParseResult.Unexpected(expectedType, found) =>
        Left(failF(expectedType, found.toString))
      case ParseResult.Found(value) => Right(value)
    }
  }

  def seq[T <: U: ClassTag]: Either[String, Seq[T]] = {
    val buffer = new mutable.ArrayBuffer[T]
    var loop: Boolean = false
    do {
      next_[T] match {
        case Found(value) =>
          buffer.addOne(value)
          loop = true
        case _ =>
          loop = false
      }
    } while (loop)
    Right(buffer.toSeq)
  }

  def seq[A](parse: => Either[String, A]): Either[String, Seq[A]] = {
    val buffer = new mutable.ArrayBuffer[A]
    var loop: Boolean = false
    do {
      parse match {
        case Right(value) =>
          buffer.addOne(value)
          loop = true
        case _ =>
          loop = false
      }
    } while (loop)
    Right(buffer.toSeq)
  }
}

private object StructureParser {
  sealed trait ParseResult[+A]
  object ParseResult {
    final case class Empty(expected: String) extends ParseResult[Nothing]
    final case class Unexpected[U, A <: U](expectedType: String, found: U) extends ParseResult[A]
    final case class Found[A](value: A) extends ParseResult[A]
  }

  implicit class EitherParseOps[E, A](value: Either[E, A]) {
    def optional: Either[E, Option[A]] = Right(value.toOption)
  }
  private def failF(expectedType: String, found: String): String = {
    s"Error, expected type: '$expectedType', found value: '$found'"
  }
}
