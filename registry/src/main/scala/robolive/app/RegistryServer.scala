package robolive.app

import java.util.concurrent.ConcurrentHashMap
import Agent.AgentEndpointGrpc.AgentEndpoint
import Client.ClientEndpointGrpc.ClientEndpoint
import Info.InfoEndpointGrpc.InfoEndpoint
import Session.SessionEndpointGrpc.SessionEndpoint
import Storage.StorageEndpointGrpc.StorageEndpoint
import io.grpc.{ServerBuilder, ServerServiceDefinition}
import org.slf4j.LoggerFactory
import robolive.meta.BuildInfo
import robolive.server
import robolive.server.{
  AgentEndpointHandler,
  ClientEndpointHandler,
  InfoEndpointHandler,
  Server,
  SessionEndpointHandler,
  SessionState,
  SipChannel,
  StorageEndpointHandler
}
import sttp.client.SttpBackend
import sttp.client.asynchttpclient.WebSocketHandler
import sttp.client.asynchttpclient.future.AsyncHttpClientFutureBackend

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext, Future}

object RegistryServer extends App {
  val logger = LoggerFactory.getLogger(getClass)

  logger.info(s"Starting ${BuildInfo.name} v${BuildInfo.version}")

  val AgentPort = getEnv("REGISTRY_PORT_FOR_AGENT", "3476").toInt
  val InfoPort = getEnv("REGISTRY_PORT_FOR_INFO", "3477").toInt
  val ClientPort = getEnv("REGISTRY_PORT_FOR_CLIENT", "3478").toInt
  val StoragePort = getEnv("REGISTRY_PORT_FOR_STORAGE", "3479").toInt
  val SessionPort = getEnv("REGISTRY_PORT_FOR_SESSION", "3480").toInt
  val SignallingSipEndpointUri: String = getEnv("SIGNALLING_SIP_URI", "sip:localhost:9031")
  val SignallingHttpUri: String = getEnv("SIGNALLING_HTTP_URI", "http://localhost:9031")
  val StunUri: String = getEnv("STUN_URI", "stun:rl.arigativa.ru:8080")
  val AllowAll: Boolean = getEnv("ALLOW_ALL", "false").toBoolean
  val TurnUri: String = getEnv("TURN_URI", "turn:rl.arigativa.ru:8080?transport=tcp")
  val TurnUsername: String = getEnv("TURN_USERNAME", "turn")
  val TurnPassword: String = getEnv("TURN_PASSWORD", "turn")
  val RestreamType: String = getEnv("RESTREAM_TYPE", "NONE")
  val RTMPLink: String = getEnv("RTMP_LINK", "NONE")

  val ConfigMap = Map(
    "signallingUri" -> SignallingSipEndpointUri,
    "stunUri" -> StunUri,
    "turnUri" -> TurnUri,
    "turnUsername" -> TurnUsername,
    "turnPassword" -> TurnPassword,
    "restreamType" -> RestreamType,
    "rtmpLink" -> RTMPLink,
  )

  val sipSessionsState = new SessionState
  val agentSystem: Server.AgentSystem = Server.AgentSystem.create(ConfigMap)

  val agentEndpoint = {
    val agentEndpointHandler =
      new AgentEndpointHandler(agentSystem, sipSessionsState)

    runServer(
      ssd = AgentEndpoint.bindService(agentEndpointHandler, implicitly[ExecutionContext]),
      port = AgentPort
    )
  }

  val infoEndpoint = {
    val infoEndpointHandler = new InfoEndpointHandler(agentSystem)
    runServer(
      ssd = InfoEndpoint.bindService(infoEndpointHandler, implicitly[ExecutionContext]),
      port = InfoPort
    )
  }

  val sipChannel = {
    val backend: SttpBackend[Future, Nothing, WebSocketHandler] = AsyncHttpClientFutureBackend()
    new SipChannel(
      backend = backend,
      sipUri = SignallingHttpUri,
      sessionStorage = sipSessionsState,
      allowAll = AllowAll
    )
  }

  val sessionEndpoint = {
    val sessionEndpointHandler = new SessionEndpointHandler(sipSessionsState)
    runServer(
      ssd = SessionEndpoint.bindService(sessionEndpointHandler, implicitly[ExecutionContext]),
      port = SessionPort
    )
  }

  val clientEndpoint = {
    val clientEndpointHandler = new ClientEndpointHandler(agentSystem, sipChannel)
    runServer(
      ssd = ClientEndpoint.bindService(clientEndpointHandler, implicitly[ExecutionContext]),
      port = ClientPort
    )
  }

  val storageEndpoint = {
    val storageEndpointHandler = new StorageEndpointHandler(agentSystem)
    runServer(
      ssd = StorageEndpoint.bindService(storageEndpointHandler, implicitly[ExecutionContext]),
      port = StoragePort
    )
  }

  Await.result(agentEndpoint, Duration.Inf)
  Await.result(infoEndpoint, Duration.Inf)
  Await.result(clientEndpoint, Duration.Inf)
  Await.result(storageEndpoint, Duration.Inf)

  def runServer(ssd: ServerServiceDefinition, port: Int): Future[Unit] =
    Future {
      logger.info(s"Staring ${ssd.getServiceDescriptor.getName} service at port ${port}")

      val serverBuilder = ServerBuilder.forPort(port).addService(ssd).asInstanceOf[ServerBuilder[_]]
      val server = serverBuilder.build.start

      // make sure our server is stopped when jvm is shut down
      Runtime.getRuntime.addShutdownHook(new Thread() {
        override def run(): Unit = {
          logger.info(s"Stopping ${ssd.getServiceDescriptor.getName} service")
          server.shutdown()
        }
      })

      server.awaitTermination()
    }

  def getEnv(name: String, default: String): String =
    sys.env.getOrElse(name, default)
}
