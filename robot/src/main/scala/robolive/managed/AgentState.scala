package robolive.managed

import Agent.RegistryMessage.Message
import Agent.{AgentMessage, RegistryMessage}
import robolive.gstreamer.{GstManaged, PipelineManaged, VideoSources}
import robolive.microactor.MicroActor
import SipChannel.{AllocateRequest, SipChannelEndpointGrpc}
import Storage.{ReadRequest, StorageEndpointGrpc}
import org.freedesktop.gstreamer.{Bus, GstObject, Version}
import org.slf4j.Logger
import robolive.microactor.MicroActor.TimeredMicroActor
import robolive.puppet.{ClientInputInterpreter, Puppet}

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

sealed trait AgentState
    extends MicroActor.State[AgentState.Deps, RegistryMessage.Message, AgentState] {

  protected def accept(requestId: String, settings: Map[String, String]): AgentMessage = {
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

  protected def statusUpdate(status: String): AgentMessage = {
    AgentMessage(
      AgentMessage.Message.StatusUpdate(
        AgentMessage.StatusUpdate(
          status = status,
        )
      )
    )
  }

  protected def decline(requestId: String, reason: String): AgentMessage = {
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
    servoController: ClientInputInterpreter,
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
          deps.sendMessage(statusUpdate("Registered"))
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
            val videoSrcFn = settings("videoSrcFn").getOrElse("unknown")
            val signallingUri = settings("signallingUri").get
            val stunUri = settings("stunUri").get
            val enableUserVideo = settings("enableUserVideo").getOrElse("false").toBoolean

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

            implicit val gstInit: GstManaged.GSTInit.type =
              GstManaged(deps.agentName, new Version(1, 14))

            val pipelineDescription =
              s"""$videoSource ! queue ! tee name=t
                 |t. ! queue ! videoscale ! video/x-raw,width=640,height=480 ! videoconvert ! autovideosink
                 |t. ! queue name=rtpVideoSrc""".stripMargin

            val pipeline = PipelineManaged(
              name = "robolive-robot-pipeline",
              description = pipelineDescription,
            )

            def initBus(bus: Bus): Unit = {
              val eosHandler: Bus.EOS =
                (source: GstObject) => deps.logger.info(s"EOS ${source.getName}")

              val errorHandler: Bus.ERROR = (source: GstObject, code: Int, message: String) =>
                deps.logger.error(s"Error ${source.getName}: $code $message")

              bus.connect(eosHandler)
              bus.connect(errorHandler)
            }

            initBus(pipeline.getBus)

            pipeline.ready()
            pipeline.play()

            val puppet = new Puppet(
              pipeline = pipeline,
              sipRobotName = sipAgentName,
              signallingUri = signallingUri,
              stunUri = stunUri,
              enableUserVideo = enableUserVideo,
              clientInputInterpreter = deps.servoController,
              eventListener = freeRunningPuppet
            )

            deps.logger.info("trying to start puppet")

            scala.util.Try(puppet.start()) match {
              case Success(puppet) =>
                deps.logger.info("accepting incoming connection")

                val turnUri = settings("turnUri").get

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

                deps.sendMessage(statusUpdate("Busy"))

                Busy(
                  puppet = puppet,
                  clientName = sipClientName,
                  agentName = sipAgentName,
                  duration = sipChannelAllocationResponse.durationSeconds
                )

              case Failure(exception) =>
                val errorMessage = s"Can not start-up the puppet: ${exception.getMessage}"
                deps.logger.error(errorMessage, exception)
                deps.sendMessage(decline(clientConnectionRequest.requestId, errorMessage))
                this
            }
          }).recover {
            case error =>
              val errorMessage = s"Registry communication error: ${error.getMessage}"
              deps.logger.error(errorMessage, error)
              deps.sendMessage(decline(clientConnectionRequest.requestId, errorMessage))
              this
          }

        case other =>
          deps.logger.error(s"Unexpected message $other in Registered state")
          Future.successful(this)
      }
    }
  }

  final case class Busy(puppet: Puppet, clientName: String, agentName: String, duration: Long)
      extends AgentState {
    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        // fixme: hack to not create additional message for `Disconnect`
        case Message.Registered(_) =>
          puppet.stop()
          deps.sendMessage(statusUpdate("Registered"))
          Future.successful(AgentState.Registered)

        case other @ Message.Connected(clientConnectionRequest) =>
          deps.logger.error(s"Unexpected message $other in Busy state")
          deps.sendMessage(
            decline(clientConnectionRequest.requestId, "Can not make new connection: `Busy`")
          )
          Future.successful(this)

        case other =>
          deps.logger.error(s"Unexpected message $other in Busy state")
          Future.successful(this)
      }
    }
  }
}
