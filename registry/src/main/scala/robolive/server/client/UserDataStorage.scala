package robolive.server.client

import robolive.server.Server
import io.circe.parser
import robolive.server.client.UserDataStorage.PersistentUserData

import scala.util.Using

final class UserDataStorage(path: String) {

  def read(): scala.util.Try[List[PersistentUserData]] = {
    Using(scala.io.Source.fromFile(path)) { reader =>
      val raw = reader.mkString
      parser.decode[List[PersistentUserData]](raw) match {
        case Left(error) => throw new RuntimeException(error)
        case Right(value) => value
      }
    }
  }

  def write(agentState: List[PersistentUserData]): scala.util.Try[Unit] = {
    import java.io.PrintWriter
    import io.circe.syntax._

    Using(new PrintWriter(path)) { writer =>
      writer.write(agentState.asJson.spaces2SortKeys)
    }
  }
}

object UserDataStorage {
  import io.circe.generic.extras.semiauto._
  import io.circe.generic.extras.Configuration
  import io.circe.{Decoder, Encoder}

  implicit val config: Configuration = Configuration.default

  final case class PersistentUserData(
    login: String,
    password: String,
    uiSettings: Map[Server.Login, PersistentUIDescription],
  )

  final case class PersistentUIDescription(
    buttons: Seq[PersistentButton]
  )

  object PersistentUIDescription {
    implicit val decoder: Decoder[PersistentUIDescription] = deriveConfiguredDecoder
    implicit val encoder: Encoder[PersistentUIDescription] = deriveConfiguredEncoder
  }

  final case class PersistentButton(name: String, template: String)
  object PersistentButton {
    implicit val decoder: Decoder[PersistentButton] = deriveConfiguredDecoder
    implicit val encoder: Encoder[PersistentButton] = deriveConfiguredEncoder
  }

  object PersistentUserData {
    implicit val decoder: Decoder[PersistentUserData] = deriveConfiguredDecoder
    implicit val encoder: Encoder[PersistentUserData] = deriveConfiguredEncoder
  }
}
