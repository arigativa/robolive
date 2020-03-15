package ru.arigativa.robolive.wsrelay

import cats.effect.{Concurrent, ConcurrentEffect, ContextShift, ExitCode, Timer}
import fs2.Stream
import io.chrisdavenport.log4cats.Logger
import org.http4s.HttpApp
import org.http4s.server.blaze.BlazeServerBuilder
import org.http4s.server.middleware.{Logger => Http4sLogger}

object HttpServer {
  def make[F[_]: Concurrent : ConcurrentEffect : Logger : Timer: ContextShift](
    httpApp: HttpApp[F],
    host: String = "0.0.0.0", port: Int = 5000,
  ): Stream[F, ExitCode] = {
    for {
      exitCode <-
        BlazeServerBuilder[F]
          .bindHttp(port, host)
          .withHttpApp(Http4sLogger.httpApp(logHeaders = true, logBody = true)(httpApp))
          .serve
    } yield exitCode
  }
}
