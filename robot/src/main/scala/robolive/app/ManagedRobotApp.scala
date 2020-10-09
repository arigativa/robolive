package robolive.app

import Agent.AgentEndpointGrpc
import SipChannel.SipChannelEndpointGrpc
import Storage.StorageEndpointGrpc
import io.grpc.ManagedChannelBuilder
import robolive.managed.RunningPuppet

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.concurrent.ExecutionContext.Implicits.global

object ManagedRobotApp extends App {

  object RegistryConnection {
    val Host: String = getEnv("REGISTRY_HOST", "localhost")
    val StoragePort: Int = getEnv("REGISTRY_PORT_FOR_STORAGE", "3479").toInt
    val AgentPort: Int = getEnv("REGISTRY_PORT_FOR_AGENT", "3476").toInt
    val SipChannelPort = getEnv("REGISTRY_PORT_FOR_SIP_CHANNEL", "3480").toInt

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

  val runningPuppet =
    new RunningPuppet(
      name = robotName,
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
