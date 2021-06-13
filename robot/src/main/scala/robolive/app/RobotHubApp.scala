package robolive.app

import Agent.AgentEndpointGrpc
import Puppet.Command
import Puppet.Command.{ClientCommand, GstreamerPipeline}
import Storage.StorageEndpointGrpc
import org.slf4j.LoggerFactory
import robolive.BuildInfo
import robolive.managed.{
  ClientInputInterpreter,
  ConfigurationManager,
  ConstVideoSource,
  RunningPuppet,
}
import robolive.puppet.RemotePuppet
import robolive.registry.Clients

import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.{Failure, Success, Using}

object RobotHubApp extends App {

  val log = LoggerFactory.getLogger(getClass)

  val RemoteRobotIP =
    getEnv("REMOTE_ROBOT_IP").getOrElse(throw new RuntimeException("Specify REMOTE_ROBOT_IP"))
  val RemoteRobotPort = getEnv("REMOTE_ROBOT_PORT").getOrElse("7777").toInt
  val LocalHubIp =
    getEnv("LOCAL_HUB_IP").getOrElse(throw new RuntimeException("Specify LOCAL_HUB_IP"))

  log.info(BuildInfo.toString)
  log.info(s"$getClass started")

  object RegistryConnection {
    val Host: String = getEnv("REGISTRY_HOST", "localhost")
    val AgentPort: Int = getEnv("REGISTRY_PORT_FOR_AGENT", "10476").toInt
    val StoragePort: Int = getEnv("REGISTRY_PORT_FOR_STORAGE", "10479").toInt
    val SipChannelPort: Int = getEnv("REGISTRY_PORT_FOR_SIP_CHANNEL", "10480").toInt
    val usePlaintext: Boolean = getEnv("INVENTORY_USE_PLAINTEXT", "true").toBoolean
  }

  val ConfigurationPath =
    getEnv("CONFIG_PATH").getOrElse(throw new RuntimeException("Please, specify CONFIG_PATH"))

  val defaultVideoSource: String =
    getEnv("DEFAULT_VIDEO_PIPELINE", "videotestsrc is-live=true pattern=ball ! videoconvert")

  val robotName = getEnv(
    name = "ROBOT_NAME",
    default = throw new RuntimeException("`ROBOT_NAME` environment variable is undefined")
  )

  val configurationManager = new ConfigurationManager(ConfigurationPath)

  implicit object PuppetReleasable extends Using.Releasable[RunningPuppet] {
    override def release(resource: RunningPuppet): Unit = {
      resource.stop("releasing resources")
      Await.ready(resource.terminated, 3.second)
    }
  }

  var gracefulQuit = false

  while (!gracefulQuit) {
    Thread.sleep(1000)
    log.info("connecting to registry")

    Clients.grpcChannel(
      RegistryConnection.Host,
      RegistryConnection.AgentPort,
      RegistryConnection.usePlaintext
    ) { agentChannel =>
      Clients.grpcChannel(
        RegistryConnection.Host,
        RegistryConnection.StoragePort,
        RegistryConnection.usePlaintext
      ) { storageChannel =>
        Using.resource(new RemotePuppet(RemoteRobotIP, RemoteRobotPort)) { remotePuppet =>
          val clientInputInterpreter = new ClientInputInterpreter {
            override def clientInput(input: String): Future[String] = {
              remotePuppet
                .runCommand(Puppet.Command.Command.ClientCommand(ClientCommand(input)))
                .map { output =>
                  output.log.getOrElse("<empty>")
                }
            }
          }

          Using.resource(
            new RunningPuppet(
              name = robotName,
              videoSources = new ConstVideoSource(
//                s"videotestsrc is-live=true pattern=ball ! videoconvert ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency"
                s"""udpsrc port=0 name=udpVideoSrc0 mtu=150000 caps="video/x-h264, stream-format=(string)byte-stream, media=video""""
              ),
              agentEndpointClient = AgentEndpointGrpc.stub(agentChannel),
              storageEndpointClient = StorageEndpointGrpc.stub(storageChannel),
              servoController = clientInputInterpreter,
              configurationManager = configurationManager,
              onPipelineStarted = { pipeline =>
                pipeline.getElementByName("udpVideoSrc0") match {
                  case null => log.error("Could not find udpVideoSrc0 to perform network link")
                  case srcElem =>
                    srcElem.get("port") match {
                      case port: Integer =>
                        val res = remotePuppet
                          .runCommand(
                            Puppet.Command.Command.GstPipeline(
                              GstreamerPipeline(
                                s"""videotestsrc is-live=true pattern=ball ! videoconvert ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency ! udpsink host=$LocalHubIp port=${port
                                  .intValue()}"""
                              )
                            )
                          )
                        res.onComplete {
                          case Failure(exception) =>
                            log.error("Fail to send pipeline to agent", exception)
                          case Success(value) =>
                            log.info(s"Pipeline sent to agent, result: `$value``")
                        }
                        Await.result(res, Duration.Inf)
                      case value =>
                        log.error(s"invalid port value: ${value}")
                    }
                }
              }
            )
          ) { runningPuppet =>
            runningPuppet.register()

            Await.result(
              runningPuppet.terminated.map(_ => None).recover { case th => Some(th) },
              Duration.Inf
            ) match {
              case Some(error) =>
                log.warn("RunningPuppet failed", error)
                log.info("restarting the robot, after a 1 second nap")
              case None =>
                log.info("registry finished session, shutting down the robot")
                gracefulQuit = true
            }
          }
        }
      }
    }
  }
}
