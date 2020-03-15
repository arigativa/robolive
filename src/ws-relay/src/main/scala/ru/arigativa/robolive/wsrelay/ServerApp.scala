package ru.arigativa.robolive.wsrelay

import cats.effect.{ExitCode, IO, IOApp}
import cats.implicits._

object ServerApp extends IOApp {
  def run(args: List[String]): IO[ExitCode] =
    Server.stream[IO].compile.drain.as(ExitCode.Success)
}