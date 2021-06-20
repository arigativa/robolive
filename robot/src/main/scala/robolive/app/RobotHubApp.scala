package robolive.app

import Agent.AgentEndpointGrpc
import Puppet.Command.{ClientCommand, GstreamerPipeline}
import Storage.StorageEndpointGrpc
import org.slf4j.LoggerFactory
import robolive.BuildInfo
import robolive.managed.{
  Clients,
  ConfigurationManager,
  ConstVideoSource,
  SimpleFunctionCalculator,
  TemplatedVideoSource
}
import robolive.puppet.{RemotePuppet, RunningPuppet}

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

  val videoSources = new TemplatedVideoSource(
    new SimpleFunctionCalculator(
      Map(
        "jetson_camera_all(sensor_id,sensor_mode,width,height,flip_method,fps)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=30/1, format=NV12 ! nvvidconv flip-method=$$flip_method$$ ! videoconvert ! videoscale ! video/x-raw,width=$$width$$,height=$$height$$",
        "jetson_camera_scaled(sensor_id,sensor_mode,width,height)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert ! videoscale ! video/x-raw,width=$$width$$,height=$$height$$",
        "jetson_camera(sensor_id,sensor_mode,flip_method)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=$$flip_method$$ ! videoconvert",
        "circles" -> "videotestsrc is-live=true pattern=ball ! videoconvert",
        "circles_h264" -> "videotestsrc is-live=true pattern=ball ! videoconvert ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency",
        "remote_udp" -> """udpsrc port=0 name=udpVideoSrc0 mtu=150000 caps="video/x-h264, stream-format=(string)byte-stream, media=video"""",
        "autovideosrc" -> "autovideosrc ! videoconvert"
      )
    ),
    defaultVideoSource
  )

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
        Using.resource(
          new RunningPuppet(
            name = robotName,
            videoSources = videoSources,
            agentEndpointClient = AgentEndpointGrpc.stub(agentChannel),
            storageEndpointClient = StorageEndpointGrpc.stub(storageChannel),
            configurationManager = configurationManager,
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
