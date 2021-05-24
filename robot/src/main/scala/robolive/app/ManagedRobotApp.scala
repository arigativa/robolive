package robolive.app

import Agent.AgentEndpointGrpc
import Storage.StorageEndpointGrpc
import org.slf4j.LoggerFactory
import robolive.BuildInfo
import robolive.gstreamer.{PipelineDescription, SimpleFunctionCalculator, VideoSources}
import robolive.managed.{ConfigurationManager, RunningPuppet}
import robolive.puppet.ClientInputInterpreter
import robolive.registry.Clients

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, DurationInt}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.Using

object ManagedRobotApp extends App {

  val log = LoggerFactory.getLogger(getClass)

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

  val videoSources = new VideoSources(
    new SimpleFunctionCalculator(
      Map(
        "jetson_camera_all(sensor_id,sensor_mode,width,height,flip_method)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=30/1, format=NV12 ! nvvidconv flip-method=$$flip_method$$ ! videoconvert ! videoscale ! video/x-raw,width=$$width$$,height=$$height$$",
        "jetson_camera_scaled(sensor_id,sensor_mode,width,height)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert ! videoscale ! video/x-raw,width=$$width$$,height=$$height$$",
        "jetson_camera(sensor_id,sensor_mode,flip_method)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=$$flip_method$$ ! videoconvert",
        "circles" -> "videotestsrc is-live=true pattern=ball ! videoconvert",
        "autovideosrc" -> "autovideosrc ! videoconvert"
      )
    ),
    defaultVideoSource
  )

  val servoController = getEnv("SERVO_CONTROLLER_TYPE", "FAKE") match {
    case "SERIAL" =>
      new ClientInputInterpreter.ClientInputInterpreterImpl(log)
    case "FAKE" => new ClientInputInterpreter.FakeClientInputInterpreter(log)
  }

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
            servoController = servoController,
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
