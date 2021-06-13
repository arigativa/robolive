package robolive
package managed

import Agent.RegistryMessage.{Message, RegisterResponse}
import Agent.{AgentMessage, RegistryMessage}
import Storage.{ReadRequest, StorageEndpointGrpc}
import gstmanaged.managed.{GstManaged, PipelineDescription, PipelineManaged}
import org.freedesktop.gstreamer.{Pipeline, Version}
import org.slf4j.Logger
import robolive.managed.AgentState.Deps
import robolive.puppet.{
  RegistrationClientHandler,
  SIPCallEventHandler,
  SipClient,
  SipConfig,
  WebRTCController
}

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success}

sealed trait AgentState {

  def apply(deps: Deps, event: RegistryMessage.Message)(
    implicit ec: ExecutionContext
  ): Future[AgentState]

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

  protected def settingsUpdate(key: String, value: String): AgentMessage = {
    AgentMessage(
      AgentMessage.Message.SettingUpdate(
        AgentMessage.SettingUpdate(
          key = key,
          value = value,
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
    logger: Logger,
    agentName: String,
    videoSources: VideoSources,
    servoController: ClientInputInterpreter,
    storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
    sendMessage: AgentMessage => Unit,
    onPipelineStarted: Pipeline => Unit,
    configurationManager: ConfigurationManager,
  )

  val VideoSrcFn = "videoSrcFn"
  val RestreamType = "restreamType"
  val RTMPLink = "rtmpLink"
  val ShareRestreamLink = "shareRestreamLink"

  final case class Idle() extends AgentState {

    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        case Message.Registered(RegisterResponse(connectionId, login, password, _)) =>
          deps.configurationManager.write(ConfigurationManager.Config(login, password))
          deps.storageEndpointClient
            .get(
              ReadRequest(
                Seq(VideoSrcFn, RestreamType, RTMPLink, ShareRestreamLink),
                login,
                password
              )
            )
            .map { storageResponse =>
              val restreamType = {
                val rawType = storageResponse.values.getOrElse(RestreamType, "NONE")
                PipelineDescription.RestreamType.fromUnsafe(rawType)
              }

              val rtmpLink: String = storageResponse.values.getOrElse(RTMPLink, "NONE")

              val shareRestreamLink: Option[String] =
                storageResponse.values.get(ShareRestreamLink)

              val videoSource = deps.videoSources.getFromSettings(storageResponse.values)
              deps.logger.info(s"using video source: $videoSource")

              implicit val gstInit: GstManaged.GSTInit.type =
                GstManaged(deps.agentName, new Version(1, 14))

              val pipelineDescription =
                PipelineDescription.description(restreamType, Some(rtmpLink), videoSource)

              deps.logger.info(s"running pipeline: $pipelineDescription")

              val pipeline = PipelineManaged(
                name = "robolive-robot-pipeline",
                description = pipelineDescription,
                logger = deps.logger,
              )

              pipeline.ready()
              pipeline.pause()

              deps.logger.info(s"pipeline state: ${pipeline.getState}")

              deps.onPipelineStarted(pipeline)

              pipeline.play()
              deps.logger.info(s"pipeline state: ${pipeline.getState}")

              deps.sendMessage(statusUpdate("Registered"))

              shareRestreamLink.foreach { link =>
                deps.sendMessage(settingsUpdate(ShareRestreamLink, link))
              }

              Registered(
                pipeline,
                gstInit,
                connectionId,
                login,
                password,
                () => {
                  pipeline.stop()
                  gstInit.dispose()
                }
              )
            }

        case other =>
          deps.logger.error(s"Unexpected message $other in Idle state")
          Future.successful(this)
      }
    }

    def stop(): AgentState = Idle()
  }

  final case class Registered(
    pipeline: Pipeline,
    gstInit: GstManaged.GSTInit.type,
    connectionId: String,
    login: String,
    password: String,
    stopInitialPipeline: () => Unit,
  ) extends AgentState {
    private val SignallingUri = "signallingUri"
    private val StunUri = "stunUri"
    private val ServoControllerType = "servoControllerType"
    private val TurnUri = "turnUri"
    @volatile private var currentSipClient: SipClient = _
    private val stopSipClient = () => {
      if (currentSipClient ne null ) currentSipClient.stop()
      currentSipClient = null
    }

    private val puppetConfigurationKeys = Seq(
      SignallingUri,
      StunUri,
      ServoControllerType,
      TurnUri
    )

    override def apply(deps: Deps, event: RegistryMessage.Message)(
      implicit ec: ExecutionContext
    ): Future[AgentState] = {
      event match {
        case Message.Connected(clientConnectionRequest) =>
          if (currentSipClient ne null) throw new RuntimeException("Agent is Busy")

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

            deps.logger.info(s"Starting Robolive inc. robot")
            deps.logger.info(s"Trying to connect to signalling `$signallingUri`")
            deps.logger.info(s"Trying to start puppet, thread: ${Thread.currentThread().getId}")

            var stopHook: () => () = null
            scala.util.Try({
              val stunUriFixed = stunUri.replaceAll("stun:", "stun://")
              val controller =
                new WebRTCController(
                  videoSourcePipeline = pipeline,
                  stunServerUrl = stunUriFixed,
                )(gstInit)

              val sipConfig = SipConfig(
                registrarUri = signallingUri,
                name = connectionId,
              )

              stopHook = () => {
                stopSipClient()
                if (controller ne null) controller.dispose()
                deps.sendMessage(statusUpdate("Registered"))
              }

              val sipEventsHandler =
                new SIPCallEventHandler(
                  controller,
                  deps.servoController,
                  stopHook
                )

              val registrationClientHandler = new RegistrationClientHandler(stopHook)

              currentSipClient = new SipClient(
                sipEventsHandler,
                registrationClientHandler,
                sipConfig,
              )

              currentSipClient.start(60)
            }) match {
              case Success(()) =>
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

                this

              case Failure(exception) =>
                val errorMessage = s"Can not start-up the puppet: ${exception.getMessage}"
                deps.logger.error(errorMessage, exception)
                deps.sendMessage(decline(clientConnectionRequest.requestId, errorMessage))
                stopHook()
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
}
