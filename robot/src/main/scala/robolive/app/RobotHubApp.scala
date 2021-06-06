package robolive.app

import Agent.AgentEndpointGrpc
import Puppet.Command
import Puppet.Command.{ClientCommand, GstreamerPipeline}
import Storage.StorageEndpointGrpc
import org.freedesktop.gstreamer.elements.PlayBin
import org.slf4j.LoggerFactory
import robolive.BuildInfo
import robolive.gstreamer.{ConstVideoSource, SimpleFunctionCalculator, VideoSources}
import robolive.managed.{ConfigurationManager, RunningPuppet}
import robolive.puppet.{ClientInputInterpreter, RemotePuppet}
import robolive.registry.Clients

import java.rmi.Remote
import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.{Duration, DurationInt}
import scala.util.{Failure, Success, Using}

object RobotHubApp extends App {

  val log = LoggerFactory.getLogger(getClass)

  val RemoteRobotIP = getEnv("REMOTE_ROBOT_IP").getOrElse(throw new RuntimeException("Specify REMOTE_ROBOT_IP"))
  val RemoteRobotPort = getEnv("REMOTE_ROBOT_PORT").getOrElse("7777").toInt
  val LocalHubIp = getEnv("LOCAL_HUB_IP").getOrElse(throw new RuntimeException("Specify LOCAL_HUB_IP"))

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
              remotePuppet.runCommand(Puppet.Command.Command.ClientCommand(ClientCommand(input)))
                .map { output =>
                  output.log.getOrElse("<empty>")
                }
            }
          }

          Using.resource(
            new RunningPuppet(
              name = robotName,
              videoSources = new ConstVideoSource(
//                "autovideosrc ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency"
                s"udpsrc port=0 name=udpVideoSrc0 ! queue ! application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96 ! rtph264depay ! h264parse"
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
                        Await.result(remotePuppet.runCommand(Puppet.Command.Command.GstPipeline(GstreamerPipeline(
                          "nvarguscamerasrc sensor_id=0 sensor_mode=4" +
                            " ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=30/1, format=NV12" +
                            " ! nvvidconv flip-method=2" +
                            " ! nvv4l2h264enc maxperf-enable=1" +
                            " ! video/x-h264,width=1280,height=720" +
                            " ! queue" +
                            " ! rtph264pay" +
                            s" ! udpsink host=$LocalHubIp port=${port.intValue()}"
                        ))), Duration.Inf)
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
