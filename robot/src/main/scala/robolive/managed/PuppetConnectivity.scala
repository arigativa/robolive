package robolive.managed

import java.util.concurrent.atomic.AtomicReference

import Inventory.{AgentCommand, AgentStatus, RegistryInventoryGrpc}
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory

import scala.concurrent.{ExecutionContext, Future, Promise}

object PuppetConnectivity {

  final class CommandReceiver(
    currentState: AtomicReference[RobotState],
    stateUpdated: AgentStatus => Unit,
    puppetSoul: PuppetSoul,
    terminate: Promise[Unit]
  ) extends StreamObserver[AgentCommand] {
    private val logger = LoggerFactory.getLogger(getClass.getName)

    override def onNext(command: AgentCommand): Unit = {
      logger.info(s"received command: $command")
      val newState = puppetSoul.executeCommand(currentState.get(), command)
      currentState.set(newState)
      stateUpdated(newState.toAgentStatus)
    }

    override def onError(error: Throwable): Unit = {
      logger.error("error occured", error)
      terminate.success(())
    }

    override def onCompleted(): Unit = {
      logger.info("Inventory closed the connection")
      terminate.success(())
    }
  }

  class RunningPuppet(
    client: RegistryInventoryGrpc.RegistryInventoryStub,
    puppetSoul: PuppetSoul,
    initialState: RobotState,
  )(implicit ec: ExecutionContext) {
    private val logger = LoggerFactory.getLogger(getClass.getName)
    private val terminatedPromise: Promise[Unit] = {
      val terminate = Promise[Unit]()
      terminate.future.onComplete(_ => statusReporting.onCompleted())
      terminate
    }

    private val robotState = new AtomicReference[RobotState](initialState)

    val commandReceiver: StreamObserver[AgentCommand] = new CommandReceiver(
      currentState = robotState,
      stateUpdated = (status: AgentStatus) => statusReporting.onNext(status),
      puppetSoul = puppetSoul,
      terminate = terminatedPromise,
    )

    val statusReporting: StreamObserver[AgentStatus] = client.join(commandReceiver)
    statusReporting.onNext(initialState.toAgentStatus)

    def terminated: Future[Unit] = terminatedPromise.future

    def stop(reason: String): Unit = {
      logger.info(s"stopped, reason: `$reason`")
      terminatedPromise.success(())
    }
  }

}
