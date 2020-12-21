package robolive.managed

import Agent.RegistryMessage.Message
import Agent.{AgentMessage, RegistryMessage}
import robolive.gstreamer.VideoSources
import robolive.microactor.MicroActor
import SipChannel.{AllocateRequest, SipChannelEndpointGrpc}
import Storage.{ReadRequest, StorageEndpointGrpc}
import org.slf4j.Logger
import robolive.microactor.MicroActor.TimeredMicroActor
import robolive.puppet.Puppet

import java.util.Timer
import java.util.concurrent.atomic.AtomicReference
import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

sealed trait AgentState
    extends MicroActor.State[AgentState.Deps, RegistryMessage.Message, AgentState]

object AgentState {
  final case class Deps(
    enclosingMicroActor: () => TimeredMicroActor[
      AgentState.Deps,
      RegistryMessage.Message,
      AgentState
    ],
    logger: Logger,
    agentName: String,
    videoSources: VideoSources,
    storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
    sipChannelEndpointClient: SipChannelEndpointGrpc.SipChannelEndpointStub,
    sendMessage: AgentMessage => Unit,
  )

  final case object Idle extends AgentState {
    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        case Message.Registered(_) =>
          Future.successful(Registered)

        case other =>
          deps.logger.error(s"Unexpected message $other in Idle state")
          Future.successful(this)
      }
    }
  }

  final case object Registered extends AgentState {
    private val VideoSrcFn = "videoSrcFn"
    private val SignallingUri = "signallingUri"
    private val StunUri = "stunUri"
    private val EnableUserVideo = "enableUserVideo"
    private val ServoControllerType = "servoControllerType"
    private val TurnUri = "turnUri"

    private val puppetConfigurationKeys = Seq(
      VideoSrcFn,
      SignallingUri,
      StunUri,
      EnableUserVideo,
      ServoControllerType,
      TurnUri
    )

    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        case Message.Connected(clientConnectionRequest) =>
          deps.logger.info(s"`${clientConnectionRequest.name}` is trying to connect")

          deps.logger.info("request settings from storage")
          (for {
            storageResponse <- deps.storageEndpointClient.get(
              ReadRequest(puppetConfigurationKeys)
            )
            _ = deps.logger.info(s"got settings from storage: `$storageResponse`")
            _ = deps.logger.info("allocating sip channel")
            sipChannelAllocationResponse <- deps.sipChannelEndpointClient.allocate(
              AllocateRequest()
            )
            _ = deps.logger.info(s"sip channel allocated: $sipChannelAllocationResponse ")
          } yield {

            // fixme: user can override any setting? maybe there should be only some settings overridable by user?
            def settings(key: String): Option[String] =
              clientConnectionRequest.settings
                .get(key)
                .orElse(storageResponse.values.get(key))

            val sipAgentName = sipChannelAllocationResponse.agentName
            val sipClientName = sipChannelAllocationResponse.clientName
            val videoSrcFn = settings("videoSrcFn").get
            val signallingUri = settings("signallingUri").get
            val stunUri = settings("stunUri").get
            val enableUserVideo = settings("enableUserVideo").get.toBoolean
            val servoControllerType = settings("servoControllerType").get

            // todo: how is this part working?
            val videoSource = deps.videoSources.getSource(videoSrcFn)

            deps.logger.info(s"using video source: $videoSource")

            val freeRunningPuppet = new Puppet.PuppetEventListener {
              def stop(): Unit = {
                deps
                  .enclosingMicroActor()
                  .send(
                    RegistryMessage.Message.Registered(
                      RegistryMessage.RegisterResponse(_root_.scalapb.UnknownFieldSet.empty)
                    )
                  )
              }
            }

            val puppet = new Puppet(
              robotName = deps.agentName,
              videoSrc = videoSource,
              sipRobotName = sipAgentName,
              signallingUri = signallingUri,
              stunUri = stunUri,
              enableUserVideo = enableUserVideo,
              servoControllerType = servoControllerType,
              eventListener = freeRunningPuppet
            )

            deps.logger.info("trying to start puppet")

            scala.util.Try(puppet.start()) match {
              case Success(puppet) =>
                deps.logger.info("accepting incoming connection")

                val turnUri = settings("turnUri").get

                val timerTask = () => {
                  println(
                    s"Trying to allocate SIP channel for: ${sipChannelAllocationResponse.durationSeconds}"
                  )
                  deps.sipChannelEndpointClient
                    .allocate(
                      AllocateRequest(
                        Some(sipClientName),
                        Some(sipAgentName),
                        Some(sipChannelAllocationResponse.durationSeconds)
                      )
                    )
                    .recover {
                      case error =>
                        deps.logger.error("Unable to reschedule SIP session", error)
                    }
                  ()
                }

                deps
                  .enclosingMicroActor()
                  .scheduleTaskWhileInNextState(
                    timerTask,
                    0,
                    Math.max(sipChannelAllocationResponse.durationSeconds - 5, 5) * 1000,
                  )

                deps.sendMessage {
                  accept(
                    clientConnectionRequest.requestId,
                    Map(
                      "sipAgentName" -> sipAgentName,
                      "sipClientName" -> sipClientName,
                      "signallingUri" -> signallingUri,
                      "stunUri" -> stunUri,
                      "turnUri" -> turnUri,
                    )
                  )
                }

                Busy(
                  puppet = puppet,
                  clientName = sipClientName,
                  agentName = sipAgentName,
                  duration = sipChannelAllocationResponse.durationSeconds
                )

              case Failure(exception) =>
                val errorMessage = s"Can not start-up the puppet: ${exception.getMessage}"
                deps.logger.error(errorMessage, exception)
                decline(clientConnectionRequest.requestId, errorMessage)
                this
            }
          }).recover {
            case error =>
              val errorMessage = s"Registry communication error: ${error.getMessage}"
              deps.logger.error(errorMessage, error)
              decline(clientConnectionRequest.requestId, errorMessage)
              this
          }

        case other =>
          deps.logger.error(s"Unexpected message $other in Registered state")
          Future.successful(this)
      }
    }

    private def accept(requestId: String, settings: Map[String, String]) = {
      AgentMessage(
        AgentMessage.Message.Join(
          AgentMessage.JoinDecision(
            AgentMessage.JoinDecision.Message
              .Accepted(
                AgentMessage.JoinDecision.Accepted(settings, requestId)
              )
          )
        )
      )
    }

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
  }

  final case class Busy(puppet: Puppet, clientName: String, agentName: String, duration: Long)
      extends AgentState {
    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        // fixme: hack to not create additional message for `Disconnect`
        case Message.Registered(_) => Future.successful(AgentState.Registered)

        case other =>
          deps.logger.error(s"Unexpected message $other in Busy state")
          Future.successful(this)
      }
    }
  }
}
