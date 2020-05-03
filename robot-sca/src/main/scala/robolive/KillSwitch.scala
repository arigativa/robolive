package robolive
import zio.{IO, UIO}

sealed trait KillSwitch {
  def kill(): UIO[Unit]
  def isKilled: UIO[Boolean]
  def await: IO[Nothing, Unit]
}

object KillSwitch {
  final class PromiseKillSwitch(quit: zio.Promise[Nothing, Unit]) extends KillSwitch {
    override def kill(): UIO[Unit] = quit.succeed(()).unit
    override def isKilled: UIO[Boolean] = quit.isDone
    override def await: IO[Nothing, Unit] = quit.await
  }
}
