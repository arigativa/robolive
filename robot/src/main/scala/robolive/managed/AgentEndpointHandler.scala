package robolive.managed

import java.util.concurrent.atomic.AtomicReference

import Agent._
import SipChannel.{AllocateRequest, SipChannelEndpointGrpc}
import Storage.{ReadRequest, StorageEndpointGrpc}
import io.grpc.stub.StreamObserver
import org.slf4j.LoggerFactory
import robolive.puppet.Puppet

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

private final class AgentEndpointHandler(
  agentName: String,
  currentState: AtomicReference[AgentState],
  storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub,
  sipChannelEndpointClient: SipChannelEndpointGrpc.SipChannelEndpointStub,
  sendMessage: AgentMessage => Unit,
)(implicit ex: ExecutionContext)
    extends StreamObserver[RegistryMessage] {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  override def onNext(registryMessage: RegistryMessage): Unit = {
    logger.info(s"received command: $registryMessage")
    registryMessage.message match {
      case RegistryMessage.Message.Empty =>
      case RegistryMessage.Message.Registered(_) =>
        Option(currentState.get()) match {
          case Some(value) => logger.error(s"unexpected existing state ${value}")
          case None => currentState.set(AgentState.Registered)
        }

      case RegistryMessage.Message.Connected(clientConnectionRequest) =>
        logger.info(s"`${clientConnectionRequest.name}` is trying to connect")

        currentState.get() match {
          case AgentState.Registered =>
            logger.info("request settings from storage")
            (for {
              storageResponse <- {
                storageEndpointClient
                  .get(
                    ReadRequest(
                      Seq(
                        "videoSrc",
                        "signallingUri",
                        "stunUri",
                        "enableUserVideo",
                        "servoControllerType",
                        "turnUri"
                      )
                    )
                  )
              }
              sipChannelAllocationResponse <- sipChannelEndpointClient.allocate(AllocateRequest())
            } yield {
              logger.info(s"got settings from storage: `$storageResponse`")
              def settings(key: String): Option[String] = storageResponse.values.get(key)

              val sipAgentName = sipChannelAllocationResponse.agentName
              val sipClientName = sipChannelAllocationResponse.clientName
              val videoSrc = settings("videoSrc").get
              val signallingUri = settings("signallingUri").get
              val stunUri = settings("stunUri").get
              val enableUserVideo = settings("enableUserVideo").get.toBoolean
              val servoControllerType = settings("servoControllerType").get

              val puppet = new Puppet(
                robotName = agentName,
                videoSrc = videoSrc,
                sipRobotName = sipAgentName,
                signallingUri = signallingUri,
                stunUri = stunUri,
                enableUserVideo = enableUserVideo,
                servoControllerType = servoControllerType,
              )

              logger.info("trying to start puppet")

              scala.util.Try(puppet.start()) match {
                case Success(puppet) =>
                  logger.info("accepting incoming connection")

                  val turnUri = settings("turnUri").get

                  currentState.set(AgentState.Busy(puppet))

                  sendMessage {
                    accept(
                      Map(
                        "sipAgentName" -> sipAgentName,
                        "sipClientName" -> sipClientName,
                        "signallingUri" -> signallingUri,
                        "stunUri" -> stunUri,
                        "turnUri" -> turnUri,
                      )
                    )
                  }

                case Failure(exception) =>
                  logger.error("declining incoming connection: failed to start puppet", exception)
                  sendMessage {
                    decline(s"exception while starting up: ${exception.getMessage}")
                  }
              }
            }).recover {
              case exception =>
                logger.error(
                  "declining incoming connection: error during puppet initialization",
                  exception
                )
                sendMessage {
                  decline(s"exception while starting up: ${exception.getMessage}")
                }
            }

          case AgentState.Busy(_) =>
            val declineMessage = "declined connection request, reason: Busy"

            logger.info(declineMessage)

            sendMessage {
              decline(declineMessage)
            }

          case null | _ =>
            val declineMessage = "declined connection request, reason: agent in failed state"

            logger.error(declineMessage)

            sendMessage {
              decline(declineMessage)
            }
        }
    }
  }

  override def onError(error: Throwable): Unit = {
    logger.error("error occured", error)
  }

  override def onCompleted(): Unit = {
    logger.info("Inventory closed the connection")
    currentState.get() match {
      case AgentState.Busy(puppet) => puppet.stop()
      case null | _ =>
    }
  }

  private def decline(reason: String) = {
    AgentMessage(
      AgentMessage.Message.Join(
        AgentMessage.JoinDecision(
          AgentMessage.JoinDecision.Message
            .Declined(
              AgentMessage.JoinDecision
                .Declined(reason)
            )
        )
      )
    )
  }

  private def accept(settings: Map[String, String]) = {
    AgentMessage(
      AgentMessage.Message.Join(
        AgentMessage.JoinDecision(
          AgentMessage.JoinDecision.Message
            .Accepted(
              AgentMessage.JoinDecision.Accepted(settings)
            )
        )
      )
    )
  }
}
