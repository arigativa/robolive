package robolive.puppet

import Agent.{AgentMessage, RegistryMessage}
import Storage.StorageEndpointGrpc
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import robolive.managed.{ConfigurationManager, VideoSources}
import robolive.puppet.AgentState.Idle

import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.control.NonFatal
import scala.util.{Failure, Success}

final class RunningPuppet(
  name: String,
  videoSources: VideoSources,
  agentEndpointClient: Agent.AgentEndpointGrpc.AgentEndpointStub,
  storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
  configurationManager: ConfigurationManager,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  @volatile private var agentState: AgentState = Idle()
  private val deps = AgentState.Deps(
    logger = logger,
    agentName = name,
    videoSources = videoSources,
    storageEndpointClient = storageEndpointClient,
    sendMessage = (status: AgentMessage) => registryChannel.onNext(status),
    configurationManager = configurationManager,
  )

  private val registryChannel: StreamObserver[AgentMessage] = {
    val commandReceiver: StreamObserver[RegistryMessage] = new StreamObserver[RegistryMessage] {

      private val logger = LoggerFactory.getLogger(getClass)

      override def onNext(registryMessage: RegistryMessage): Unit = {
        try {
          agentState(deps, registryMessage.message).onComplete {
            case Failure(error) =>
              logger.error("Something went really wrong in async call: ", error)

            case Success(newState) =>
              agentState = newState
          }
        } catch {
          case NonFatal(error) => logger.error("Something went really wrong: ", error)
        }
      }

      override def onError(error: Throwable): Unit = {
        logger.error("error occured", error)
        agentState = Idle()
        terminatedPromise.failure(error)
      }

      override def onCompleted(): Unit = {
        logger.info("Inventory closed the connection")
        agentState = Idle()
        terminatedPromise.success(())
      }
    }

    agentEndpointClient.register(commandReceiver)
  }

  def register(): Unit = {
    val message = configurationManager.read() match {
      case Failure(exception) =>
        logger.error("Error reading configuration", exception)
        AgentMessage(
          AgentMessage.Message.Register(
            AgentMessage.RegisterRequest(name, None, None)
          )
        )

      case Success(value) =>
        AgentMessage(
          AgentMessage.Message.Register(
            AgentMessage.RegisterRequest(name, Some(value.login), Some(value.password))
          )
        )
    }

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
