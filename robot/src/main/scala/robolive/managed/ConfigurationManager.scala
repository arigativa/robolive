package robolive.managed

import io.circe.Encoder

import scala.util.Using

final class ConfigurationManager(path: String) {
  import io.circe._
  import ConfigurationManager._

  def read(): scala.util.Try[Config] = {
    Using(scala.io.Source.fromFile(path)) { reader =>
      val raw = reader.mkString
      parser.decode[Config](raw) match {
        case Left(error) => throw new RuntimeException(error)
        case Right(value) => value
      }
    }
  }

  def write(config: Config): scala.util.Try[Unit] = {
    import java.io.PrintWriter
    import io.circe.syntax._

    Using(new PrintWriter(path)) { writer =>
      writer.write(config.asJson.spaces2SortKeys)
    }
  }
}

object ConfigurationManager {
  final case class Config(login: String, password: String)
  object Config {
    import io.circe.Decoder
    import io.circe.generic.extras.semiauto._
    import io.circe.generic.extras.Configuration

    implicit val config: Configuration = Configuration.default
    implicit val decoder: Decoder[Config] = deriveConfiguredDecoder
    implicit val encoder: Encoder[Config] = deriveConfiguredEncoder
  }
}
