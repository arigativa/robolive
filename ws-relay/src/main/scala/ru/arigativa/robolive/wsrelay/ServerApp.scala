package ru.arigativa.robolive.wsrelay

import cats.effect.{ExitCode, IO, IOApp}
import io.chrisdavenport.log4cats.Logger
import io.chrisdavenport.log4cats.slf4j.Slf4jLogger
import org.http4s.dsl.Http4sDsl
import org.http4s.server.websocket.WebSocketBuilder
import org.http4s.{HttpApp, HttpRoutes}
import ru.arigativa.robolive.wsrelay.exchange.{
  MessageExchange,
  WSMessageExchange
}

object ServerApp extends IOApp {
  def run(args: List[String]): IO[ExitCode] = {
    val port = sys.env.get("PORT").map(_.toInt).getOrElse(5000)

    for {
      messageExchange <- MessageExchange.inMemory[IO, String, String]
      implicit0(logger: Logger[IO]) <- Slf4jLogger.create[IO]
      httpServerExitCode <- HttpServer
        .make(makeHttpApp(messageExchange), "0.0.0.0", port)
        .compile
        .last
    } yield {
      httpServerExitCode.getOrElse(ExitCode.Success)
    }
  }

  def makeHttpApp(
    messageExchange: MessageExchange[IO, String, String]
  )(implicit L: Logger[IO]): HttpApp[IO] = {
    implicit val http4Dsl: Http4sDsl[IO] = Http4sDsl[IO]
    import http4Dsl._
    import org.http4s.implicits._

    HttpRoutes
      .of[IO] {
        case GET -> Root =>
          WebSocketBuilder[IO].build(
            WSMessageExchange.websocketHandler[IO, String](messageExchange),
          )
      }
      .orNotFound
  }
}
