package robolive.microactor

import robolive.microactor.MicroActor.State

import java.util.{Timer, TimerTask}
import scala.concurrent.{ExecutionContext, Future}

abstract class MicroActor[D, E, S <: State[D, E, S]](
  private val initialState: State[D, E, S],
  deps: D
) {
  private sealed trait TaskState
  private final case object InProgress extends TaskState
  private final case class Waiting(state: State[D, E, S]) extends TaskState
  private final case object Shutdown extends TaskState

  @volatile private var currentState: TaskState = Waiting(initialState)
  @volatile private var queue = Vector.empty[E]

  def send(event: E)(implicit ec: ExecutionContext): Unit = synchronized {
    this.currentState match {
      case Shutdown =>
        println(s"Can not process $event, actor is shutdown")

      case InProgress =>
        println(s"Enqueue: $event")
        queue = queue.appended(event)

      case Waiting(evaluationState) =>
        println(s"Started: $event")
        this.currentState = InProgress
        onStateTransitioning(evaluationState)
        evaluationState
          .apply(deps, event)(ec)
          .recover { case error => onError(error, evaluationState) }
          .foreach { newState =>
            this.currentState = Waiting(newState)
            println(s"Finished: $event: $evaluationState -> ${this.currentState}")
            onStateTransitioned(newState)
            queue.headOption match {
              case Some(event) =>
                queue = queue.tail
                println(s"Try start next: $event")
                send(event)
              case None =>
                println(s"No events to process")
                ()
            }
          }
    }
  }

  protected def onStateTransitioned(newState: State[D, E, S]): Unit = {
    locally(newState)
    ()
  }
  protected def onStateTransitioning(oldState: State[D, E, S]): Unit = {
    locally(oldState)
    ()
  }

  protected def onError(error: Throwable, oldState: State[D, E, S]): State[D, E, S]

  def shutdown(): Unit = {
    println("Shutting down an actor")
    this.currentState = Shutdown
    this.queue = Vector.empty
  }
}

object MicroActor {
  private final case class TaskToSchedule(
    task: () => Unit,
    delayMillis: Long,
    repeatEachMillis: Long,
  )

  abstract class TimeredMicroActor[D, E, S <: State[D, E, S]](
    private val initialState: State[D, E, S],
    deps: D
  ) extends MicroActor[D, E, S](initialState, deps) {
    @volatile private var timer = new Timer(s"MicroActor Timer")
    @volatile private var taskToSchedule: Option[TaskToSchedule] = None

    override def shutdown(): Unit = {
      println("Trying to stop TimeredMicroActor")
      super.shutdown()
      timer.cancel()
      timer.purge()
      println("TimeredMicroActor stopped")
    }

    def onTimerError(error: Throwable): Unit = {
      println(s"Error occurred in Timer $error")
      timer.cancel()
      timer.purge()
    }

    override protected def onStateTransitioning(oldState: State[D, E, S]): Unit = {
      println(s"Stopping timers while transitioning to new state")
      timer.cancel()
      timer.purge()
      println("Timers stopped")
    }

    override protected def onStateTransitioned(
      newState: State[D, E, S]
    ): Unit = {
      taskToSchedule match {
        case Some(task) =>
          val newTimer = new Timer(s"MicroActor Timer")
          val timerTask: TimerTask = new TimerTask {
            def run(): Unit = {
              try {
                task.task()
              } catch {
                case error: Throwable => onTimerError(error)
              }
            }
          }
          newTimer.scheduleAtFixedRate(timerTask, task.delayMillis, task.repeatEachMillis)
          this.timer = newTimer

        case None => ()
      }
    }

    def scheduleTaskWhileInNextState(
      task: () => Unit,
      delayMillis: Long,
      repeatEachMillis: Long,
    ): Unit = {
      taskToSchedule = Some(
        TaskToSchedule(
          task = task,
          delayMillis = delayMillis,
          repeatEachMillis = repeatEachMillis,
        )
      )
      ()
    }
  }

  trait State[D, E, S <: State[D, E, S]] {
    def apply(deps: D, event: E)(implicit ec: ExecutionContext): Future[S]
  }
}
