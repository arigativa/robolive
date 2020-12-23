package robolive.app

import Agent.AgentEndpointGrpc
import SipChannel.SipChannelEndpointGrpc
import Storage.StorageEndpointGrpc
import io.grpc.ManagedChannelBuilder
import org.slf4j.LoggerFactory
import robolive.gstreamer.{SimpleFunctionCalculator, VideoSources}
import robolive.managed.RunningPuppet

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext.Implicits.global

object ManagedRobotApp extends App {

  val log = LoggerFactory.getLogger(getClass)

  log.info(s"Managed robot ($getClass) started")

  object RegistryConnection {
    val Host: String = getEnv("REGISTRY_HOST", "localhost")
    val StoragePort: Int = getEnv("REGISTRY_PORT_FOR_STORAGE", "10479").toInt
    val AgentPort: Int = getEnv("REGISTRY_PORT_FOR_AGENT", "10476").toInt
    val SipChannelPort = getEnv("REGISTRY_PORT_FOR_SIP_CHANNEL", "10480").toInt

    val usePlaintext: Boolean = getEnv("INVENTORY_USE_PLAINTEXT", "true").toBoolean
  }

  val agentEndpointClient: AgentEndpointGrpc.AgentEndpointStub = {
    val channel = {
      val b =
        ManagedChannelBuilder.forAddress(RegistryConnection.Host, RegistryConnection.AgentPort)
      if (RegistryConnection.usePlaintext) b.usePlaintext()
      b.build()
    }
    AgentEndpointGrpc.stub(channel)
  }

  val storageEndpointClient: StorageEndpointGrpc.StorageEndpointStub = {
    val channel = {
      val b =
        ManagedChannelBuilder.forAddress(RegistryConnection.Host, RegistryConnection.StoragePort)
      if (RegistryConnection.usePlaintext) b.usePlaintext()
      b.build()
    }
    StorageEndpointGrpc.stub(channel)
  }

  val sipEndpointClient: SipChannelEndpointGrpc.SipChannelEndpointStub = {
    val channel = {
      val b =
        ManagedChannelBuilder.forAddress(RegistryConnection.Host, RegistryConnection.SipChannelPort)
      if (RegistryConnection.usePlaintext) b.usePlaintext()
      b.build()
    }
    SipChannelEndpointGrpc.stub(channel)
  }

  val robotName = getEnv(
    name = "ROBOT_NAME",
    default = throw new RuntimeException("`ROBOT_NAME` environment variable is undefined")
  )

  val videoSources = new VideoSources(
    new SimpleFunctionCalculator(
      Map(
        "jetson_camera_scaled(sensor_id,sensor_mode,height)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert ! videoscale ! video/x-raw,height=$$height$$",
        "jetson_camera(sensor_id,sensor_mode)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert",
        "circles" -> "videotestsrc is-live=true pattern=ball ! videoconvert",
      )
    ),
    "circles"
  )

  val runningPuppet =
    new RunningPuppet(
      name = robotName,
      videoSources = videoSources,
      agentEndpointClient = agentEndpointClient,
      storageEndpointClient = storageEndpointClient,
      sipChannelEndpointClient = sipEndpointClient,
    )

  runningPuppet.register()

  sys.addShutdownHook {
    runningPuppet.stop("killed by OS")
  }

  Await.result(runningPuppet.terminated, Duration.Inf)
}
