package robolive

import zio.{Task, ZIO}

object ImpureWorldAdapter {
  sealed trait OutputChannel[T] {
    def put(value: T): Unit
  }

  final class ZioQueueChannel[T](
    console: zio.console.Console.Service,
    messagesOut: zio.Queue[T],
  ) extends OutputChannel[T] {
    protected def run[U](task: Task[U]): Unit = zio.Runtime.global.unsafeRunAsync_(task)

    override def put(value: T): Unit = run {
      messagesOut
        .offer(value)
        .tap { isSubmitted =>
          ZIO.when(!isSubmitted)(console.putStrLn("Can not submit message to queue"))
        }
    }
  }

}
