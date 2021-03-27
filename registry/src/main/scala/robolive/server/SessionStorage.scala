package robolive.server
import io.circe.{parser, Decoder, Encoder}

import scala.util.Using

final class SessionStorage(path: String) {
  import SessionStorage._

  def read(): scala.util.Try[SessionStorageData] = {
    Using(scala.io.Source.fromFile(path)) { reader =>
      val raw = reader.mkString
      parser.decode[SessionStorageData](raw) match {
        case Left(error) => throw new RuntimeException(error)
        case Right(value) => value
      }
    }
  }

  def write(agentState: SessionStorageData): scala.util.Try[Unit] = {
    import java.io.PrintWriter
    import io.circe.syntax._

    Using(new PrintWriter(path)) { writer =>
      writer.write(agentState.asJson.spaces2SortKeys)
    }
  }
}

object SessionStorage {
  import io.circe.generic.extras.semiauto._
  import io.circe.generic.extras.Configuration

  implicit val config: Configuration = Configuration.default

  final case class SessionStorageData(
    ongoingSessions: Seq[OngoingPersistentSession],
    allowedSessions: Seq[AllowedPersistentSession],
  )

  object SessionStorageData {
    implicit val decoder: Decoder[SessionStorageData] = deriveConfiguredDecoder
    implicit val encoder: Encoder[SessionStorageData] = deriveConfiguredEncoder
  }

  final case class OngoingPersistentSession(
    clientId: String,
    agentId: String,
    durationInSeconds: Long,
    startTime: Long,
  )

  object OngoingPersistentSession {
    implicit val decoder: Decoder[OngoingPersistentSession] = deriveConfiguredDecoder
    implicit val encoder: Encoder[OngoingPersistentSession] = deriveConfiguredEncoder
  }

  final case class AllowedPersistentSession(
    clientId: String,
    agentId: String,
    durationInSeconds: Long,
  )

  object AllowedPersistentSession {
    implicit val decoder: Decoder[AllowedPersistentSession] = deriveConfiguredDecoder
    implicit val encoder: Encoder[AllowedPersistentSession] = deriveConfiguredEncoder
  }
}
