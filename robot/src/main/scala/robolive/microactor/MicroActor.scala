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
          .map { newState =>
            this.currentState = Waiting(newState)
            println(s"Finished: $event: $evaluationState -> ${this.currentState}")
            onStateTransitioned(newState)
          }
          .foreach { _ =>
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

object MicroActor extends App {
  abstract class TimeredMicroActor[D, E, S <: State[D, E, S]](
    private val initialState: State[D, E, S],
    deps: D
  ) extends MicroActor[D, E, S](initialState, deps) {
    @volatile private var timer = new Timer(s"MicroActor Timer")

    override def shutdown(): Unit = {
      super.shutdown()
      timer.cancel()
      timer.purge()
    }

    override protected def onStateTransitioning(oldState: State[D, E, S]): Unit = {
      timer.cancel()
      timer.purge()
    }

    def scheduleTaskWhileInNextState(
      task: () => Unit,
      delayMillis: Long,
      repeatEachMillis: Long,
    ): Unit = {
      val newTimer = new Timer(s"MicroActor Timer")
      val timerTask: TimerTask = new TimerTask {
        def run(): Unit = {
          try {
            task()
          } catch {
            case error: Throwable =>
              println(s"Error occurred in Timer $error")
              timer.cancel()
              timer.purge()
              timer = null
              throw error
          }
        }
      }

      newTimer.scheduleAtFixedRate(timerTask, delayMillis, repeatEachMillis)
      this.timer = newTimer
      ()
    }
  }

  trait State[D, E, S <: State[D, E, S]] {
    def apply(deps: D, event: E)(implicit ec: ExecutionContext): Future[S]
  }

  implicit val ec: ExecutionContext = ExecutionContext.global

  final case class Depends(
    dep1: String,
    dep2: Int,
    actor: () => TimeredMicroActor[Depends, TestEvent, TestState]
  )

  final case class TestEvent(num: Int)
  final case class TestState() extends State[Depends, TestEvent, TestState] {
    override def apply(deps: Depends, e: TestEvent)(
      implicit ec: ExecutionContext
    ): Future[TestState] = {
      Future {
        println(s"Started state transition: ${e.num}")
        deps
          .actor()
          .scheduleTaskWhileInNextState(
            () => println(s"Started task: ${e.num}"),
            0,
            500
          )
        if (e.num == 3) deps.actor().shutdown()
        Thread.sleep(3000)
        println(s"Finished state transition: ${e.num}")
        TestState()
      }
    }
  }

  final class TestActor(
    initialState: State[Depends, TestEvent, TestState],
    depends: Depends,
  ) extends TimeredMicroActor[Depends, TestEvent, TestState](initialState, depends) {
    def onError(
      error: Throwable,
      oldState: State[Depends, TestEvent, TestState]
    ): State[Depends, TestEvent, TestState] = {
      ???
    }
  }

  val agent: TimeredMicroActor[Depends, TestEvent, TestState] =
    new TestActor(TestState(), Depends("asd", 2, () => agent))

  agent.send(TestEvent(1))
  agent.send(TestEvent(2))
  agent.send(TestEvent(3))
  agent.send(TestEvent(4))

  Thread.sleep(15000)
}
