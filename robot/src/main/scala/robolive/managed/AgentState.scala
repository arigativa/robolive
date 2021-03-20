package robolive.managed

import Agent.RegistryMessage.{Message, RegisterResponse}
import Agent.{AgentMessage, RegistryMessage}
import Storage.{ReadRequest, StorageEndpointGrpc}
import org.freedesktop.gstreamer.{Pipeline, Version}
import org.slf4j.Logger
import robolive.gstreamer.{GstManaged, PipelineDescription, PipelineManaged, VideoSources}
import robolive.microactor.MicroActor
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
    sendMessage: AgentMessage => Unit,
    configurationManager: ConfigurationManager,
  )

  final case class Idle(pipelineDescription: PipelineDescription) extends AgentState {
    private val VideoSrcFn = "videoSrcFn"

    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        case Message.Registered(RegisterResponse(connectionId, login, password, _)) =>
          deps.configurationManager.write(ConfigurationManager.Config(login, password))
          deps.storageEndpointClient.get(ReadRequest(Seq(VideoSrcFn), login, password)).map {
            storageResponse =>
              val videoSource = {
                val videoSourceFn = storageResponse.values.getOrElse(VideoSrcFn, "unknown")
                deps.videoSources.getSource(videoSourceFn)
              }

              deps.logger.info(s"using video source: $videoSource")

              implicit val gstInit: GstManaged.GSTInit.type =
                GstManaged(deps.agentName, new Version(1, 14))

              val pipeline = PipelineManaged(
                name = "robolive-robot-pipeline",
                description = pipelineDescription.description(videoSource),
                logger = deps.logger
              )

              pipeline.ready()
              pipeline.play()

              deps.sendMessage(statusUpdate("Registered"))

              Registered(pipeline, gstInit, connectionId, login, password)
          }

        case other =>
          deps.logger.error(s"Unexpected message $other in Idle state")
          Future.successful(this)
      }
    }
  }

  final case class Registered(
    pipeline: Pipeline,
    gstInit: GstManaged.GSTInit.type,
    connectionId: String,
    login: String,
    password: String,
  ) extends AgentState {
    private val SignallingUri = "signallingUri"
    private val StunUri = "stunUri"
    private val EnableUserVideo = "enableUserVideo"
    private val ServoControllerType = "servoControllerType"
    private val TurnUri = "turnUri"

    private val puppetConfigurationKeys = Seq(
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
              ReadRequest(puppetConfigurationKeys, login, password)
            )
            _ = deps.logger.info(s"got settings from storage: `$storageResponse`")
            _ = deps.logger.info("allocating sip channel")
          } yield {

            // fixme: user can override any setting? maybe there should be only some settings overridable by user?
            def settings(key: String): Option[String] =
              clientConnectionRequest.settings
                .get(key)
                .orElse(storageResponse.values.get(key))

            val sipClientName = clientConnectionRequest.name
            val signallingUri = settings("signallingUri").get
            val stunUri = settings("stunUri").get
            val enableUserVideo = settings("enableUserVideo").getOrElse("false").toBoolean

            val freeRunningPuppet = new Puppet.PuppetEventListener {
              def stop(): Unit = {
                deps
                  .enclosingMicroActor()
                  .send(
                    RegistryMessage.Message.Registered(
                      RegistryMessage
                        .RegisterResponse(
                          connectionId,
                          login,
                          password,
                          _root_.scalapb.UnknownFieldSet.empty
                        )
                    )
                  )
              }
            }

            val puppet = new Puppet(
              pipeline = pipeline,
              sipAgentName = connectionId,
              signallingUri = signallingUri,
              stunUri = stunUri,
              enableUserVideo = enableUserVideo,
              clientInputInterpreter = deps.servoController,
              eventListener = freeRunningPuppet,
              gstInit = gstInit
            )

            deps.logger.info(s"trying to start puppet, thread: ${Thread.currentThread().getId}")

            scala.util.Try(puppet.start()) match {
              case Success(puppet) =>
                deps.logger.info("accepting incoming connection")

                val turnUri = settings("turnUri").get

                deps.sendMessage {
                  accept(
                    clientConnectionRequest.requestId,
                    Map(
                      "sipAgentName" -> connectionId,
                      "sipClientName" -> sipClientName,
                      "signallingUri" -> signallingUri,
                      "stunUri" -> stunUri,
                      "turnUri" -> turnUri,
                    )
                  )
                }

                deps.sendMessage(statusUpdate("Busy"))

                Busy(
                  pipeline = pipeline,
                  gstInit = gstInit,
                  puppet = puppet,
                  connectionId = connectionId,
                  login = login,
                  password = password
                )

              case Failure(exception) =>
                val errorMessage = s"Can not start-up the puppet: ${exception.getMessage}"
                deps.logger.error(errorMessage, exception)
                freeRunningPuppet.stop()
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

  final case class Busy(
    pipeline: Pipeline,
    gstInit: GstManaged.GSTInit.type,
    puppet: Puppet,
    connectionId: String,
    login: String,
    password: String,
  ) extends AgentState {
    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        // fixme: hack to not create additional message for `Disconnect`
        case Message.Registered(_) =>
          puppet.stop()
          deps.sendMessage(statusUpdate("Registered"))
          Future.successful(AgentState.Registered(pipeline, gstInit, connectionId, login, password))

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
