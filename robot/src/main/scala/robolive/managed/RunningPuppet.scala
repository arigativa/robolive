package robolive.managed
import java.util.concurrent.atomic.AtomicReference

import Agent.{AgentMessage, RegistryMessage}
import Storage.StorageEndpointGrpc
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory

import scala.concurrent.{ExecutionContext, Future, Promise}

final class RunningPuppet(
  name: String,
  agentEndpointClient: Agent.AgentEndpointGrpc.AgentEndpointStub,
  storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val registryChannel: StreamObserver[AgentMessage] = {
    val agentState = new AtomicReference[AgentState]()

    val commandReceiver: StreamObserver[RegistryMessage] = new AgentEndpointHandler(
      agentName = name,
      currentState = agentState,
      storageEndpointClient = storageEndpointClient,
      sendMessage = (status: AgentMessage) => registryChannel.onNext(status),
    )

    agentEndpointClient.register(commandReceiver)
  }

  def register(): Unit = {
    val message = AgentMessage(
      AgentMessage.Message.Register(
        AgentMessage.RegisterRequest(name)
      )
    )

    registryChannel.onNext(message)
  }

  private val terminatedPromise: Promise[Unit] = {
    val terminate = Promise[Unit]()
    terminate.future.onComplete(_ => registryChannel.onCompleted())
    terminate
  }

  def terminated: Future[Unit] = terminatedPromise.future

  def stop(reason: String): Unit = {
    logger.info(s"stopped, reason: `$reason`")
    terminatedPromise.success(())
  }
}
