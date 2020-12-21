package robolive.managed

import Agent.{AgentMessage, RegistryMessage}
import SipChannel.SipChannelEndpointGrpc
import Storage.StorageEndpointGrpc
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import robolive.gstreamer.VideoSources
import robolive.microactor.MicroActor
import robolive.microactor.MicroActor.TimeredMicroActor

import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.control.NonFatal

final class RunningPuppet(
  name: String,
  videoSources: VideoSources,
  agentEndpointClient: Agent.AgentEndpointGrpc.AgentEndpointStub,
  storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
  sipChannelEndpointClient: SipChannelEndpointGrpc.SipChannelEndpointStub,
)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  private val registryChannel: StreamObserver[AgentMessage] = {
    val commandReceiver: StreamObserver[RegistryMessage] = new StreamObserver[RegistryMessage] {
      lazy val actor: RunningPuppet.RunningPuppetActor =
        new RunningPuppet.RunningPuppetActor(
          AgentState.Idle,
          AgentState.Deps(
            () => actor,
            logger = logger,
            agentName = name,
            videoSources = videoSources,
            storageEndpointClient = storageEndpointClient,
            sipChannelEndpointClient = sipChannelEndpointClient,
            sendMessage = (status: AgentMessage) => registryChannel.onNext(status),
          )
        )

      private val logger = LoggerFactory.getLogger(getClass.getName)

      override def onNext(registryMessage: RegistryMessage): Unit = {
        try {
          actor.send(registryMessage.message)
        } catch {
          case NonFatal(error) => logger.error("Something went really wrong: ", error)
        }
      }

      override def onError(error: Throwable): Unit = {
        actor.shutdown()
        logger.error("error occured", error)
        terminatedPromise.success(())
      }

      override def onCompleted(): Unit = {
        actor.shutdown()
        logger.info("Inventory closed the connection")
        terminatedPromise.success(())
      }
    }

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

    private def decline(requestId: String, reason: String) = {
      AgentMessage(
        AgentMessage.Message.Join(
          AgentMessage.JoinDecision(
            AgentMessage.JoinDecision.Message
              .Declined(
                AgentMessage.JoinDecision
                  .Declined(reason, requestId)
              )
          )
        )
      )
    }

    def onError(
      error: Throwable,
      oldState: AgentStateAlias,
    ): AgentStateAlias = {
      val errorMessage = s"Can not start-up the puppet: ${error.getMessage}"
      deps.logger.error(errorMessage, error)
      deps.sendMessage(decline("requestId", errorMessage)) // fixme: how should this work?
      oldState
    }
  }
}
