package robolive.server

import io.circe._
import scala.util.Using

final class AgentStateStorage(path: String) {
  import AgentStateStorage._

  def read(): scala.util.Try[List[PersistentAgentState]] = {
    Using(scala.io.Source.fromFile(path)) { reader =>
      val raw = reader.mkString
      parser.decode[List[PersistentAgentState]](raw) match {
        case Left(error) => throw new RuntimeException(error)
        case Right(value) => value
      }
    }
  }

  def write(agentState: List[PersistentAgentState]): scala.util.Try[Unit] = {
    import java.io.PrintWriter
    import io.circe.syntax._

    Using(new PrintWriter(path)) { writer =>
      writer.write(agentState.asJson.spaces2SortKeys)
    }
  }
}

object AgentStateStorage {
  final case class PersistentAgentState(
    name: String,
    login: String,
    password: String,
    settings: Map[String, String],
  )
  object PersistentAgentState {
    import io.circe.generic.extras.semiauto._
    import io.circe.generic.extras.Configuration

    implicit val config: Configuration = Configuration.default
    implicit val decoder: Decoder[PersistentAgentState] = deriveConfiguredDecoder
    implicit val encoder: Encoder[PersistentAgentState] = deriveConfiguredEncoder
  }
}
