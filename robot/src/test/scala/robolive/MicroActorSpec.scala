package robolive

import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import robolive.microactor.MicroActor.{State, TimeredMicroActor}

import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future, Promise}

class MicroActorSpec extends AnyFreeSpec with Matchers {
  "MicroActor should process events until shutted down" in {
    implicit val ec: ExecutionContext = ExecutionContext.global

    val counter = new AtomicInteger(0)
    val shutdownP = Promise[Unit]
    final case class Depends(
      dep1: String,
      dep2: Int,
      actor: () => TimeredMicroActor[Depends, TestEvent, TestState]
    )

    final case class TestEvent(num: Int)
    final case class TestState(name: String) extends State[Depends, TestEvent, TestState] {
      override def apply(
        deps: Depends,
        e: TestEvent,
      )(implicit ec: ExecutionContext): Future[TestState] = {
        Future {
          counter.addAndGet(e.num)
          deps
            .actor()
            .scheduleTaskWhileInNextState(
              () => {
                println(s"Started task: ${e.num}")
              },
              0,
              500
            )
          if (e.num == 3) {
            deps.actor().shutdown()
            shutdownP.success(())
          }
          Thread.sleep(3000)
          TestState(e.num.toString)
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

    lazy val agent: TimeredMicroActor[Depends, TestEvent, TestState] =
      new TestActor(TestState("Initial"), Depends("asd", 2, () => agent))

    agent.send(TestEvent(1))
    agent.send(TestEvent(2))
    agent.send(TestEvent(3))
    agent.send(TestEvent(4))

    Await.result(shutdownP.future, Duration(15, TimeUnit.SECONDS))

    assertResult(1 + 2 + 3)(counter.get())
  }
}
