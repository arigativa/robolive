package robolive.managed

import java.util.concurrent.atomic.AtomicReference

import io.grpc.stub.StreamObserver
import robolive.managed.state.{ExitState, RobotState}
import robolive.protocols.Inventory.{Command, RegistryInventoryGrpc, RobotStatus}

import scala.concurrent.{ExecutionContext, Future, Promise}

object PuppetConnectivity {

  class RunningPuppet(
                       client: RegistryInventoryGrpc.RegistryInventoryStub,
                       puppetSoul: PuppetSoul,
                       initialState: RobotState,
                     )(implicit ec: ExecutionContext) {

    val robotState = new AtomicReference[RobotState](initialState)

    val commandReceiver: StreamObserver[Command] = new StreamObserver[Command] {
      override def onNext(command: Command): Unit = {
        println(s"Received command: $command")
        robotState.updateAndGet(currentState => {
          val newState = puppetSoul.executeCommand(currentState)(command.command)
          if (newState.status != currentState.status) {
            statusReporting.onNext(newState.status)
          }
          newState
        })
      }

      override def onError(t: Throwable): Unit = {
        println("Error occured")
        t.printStackTrace()
        terminatedPromise.success(ExitState(-1, lastError = Some(t.toString)))
      }

      override def onCompleted(): Unit = {
        println("Inventory closed the connection")
        terminatedPromise.success(ExitState(0))
      }
    }

    val statusReporting: StreamObserver[RobotStatus] = client.join(commandReceiver)
    statusReporting.onNext(initialState.status)

    private val terminatedPromise: Promise[ExitState] = Promise()

    terminatedPromise.future.onComplete(_ => statusReporting.onCompleted())

    def terminated: Future[ExitState] = terminatedPromise.future

    def stop(reason: String): Unit = {
      terminatedPromise.success(ExitState(10, lastError = Some(reason)))
      statusReporting.onCompleted()
    }
  }

}
