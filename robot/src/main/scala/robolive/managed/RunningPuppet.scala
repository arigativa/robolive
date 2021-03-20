package robolive.managed

import Agent.{AgentMessage, RegistryMessage}
import Storage.StorageEndpointGrpc
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import robolive.gstreamer.{PipelineDescription, VideoSources}
import robolive.microactor.MicroActor
import robolive.microactor.MicroActor.TimeredMicroActor
import robolive.puppet.ClientInputInterpreter

import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.{Failure, Success}
import scala.util.control.NonFatal

final class RunningPuppet(
  name: String,
  videoSources: VideoSources,
  servoController: ClientInputInterpreter,
  agentEndpointClient: Agent.AgentEndpointGrpc.AgentEndpointStub,
  storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
  pipelineDescription: PipelineDescription,
  configurationManager: ConfigurationManager,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val registryChannel: StreamObserver[AgentMessage] = {
    lazy val actor: RunningPuppet.RunningPuppetActor =
      new RunningPuppet.RunningPuppetActor(
        AgentState.Idle(pipelineDescription),
        AgentState.Deps(
          () => actor,
          logger = logger,
          agentName = name,
          videoSources = videoSources,
          servoController = servoController,
          storageEndpointClient = storageEndpointClient,
          sendMessage = (status: AgentMessage) => registryChannel.onNext(status),
          configurationManager = configurationManager,
        )
      )

    val commandReceiver: StreamObserver[RegistryMessage] = new StreamObserver[RegistryMessage] {

      private val logger = LoggerFactory.getLogger(getClass)

      override def onNext(registryMessage: RegistryMessage): Unit = {
        try {
          actor.send(registryMessage.message)
        } catch {
          case NonFatal(error) => logger.error("Something went really wrong: ", error)
        }
      }

      override def onError(error: Throwable): Unit = {
        logger.error("error occured", error)
        actor.shutdown()
        terminatedPromise.failure(error)
      }

      override def onCompleted(): Unit = {
        logger.info("Inventory closed the connection")
        actor.shutdown()
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

object RunningPuppet {
  final class RunningPuppetActor(
    initialState: AgentState,
    deps: AgentState.Deps
  ) extends TimeredMicroActor[AgentState.Deps, RegistryMessage.Message, AgentState](
        initialState,
        deps,
      ) {
    type AgentStateAlias = MicroActor.State[
      AgentState.Deps,
      RegistryMessage.Message,
      AgentState
    ]

    def onError(
      error: Throwable,
      oldState: AgentStateAlias,
    ): AgentStateAlias = {
      val errorMessage = s"Fallback on previous state. Uncaught error: `${error.getMessage}`"
      deps.logger.error(errorMessage, error)
      oldState
    }
  }
}
