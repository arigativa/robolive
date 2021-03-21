package robolive.server

import Agent.RegistryMessage
import org.slf4j.LoggerFactory
import robolive.server.Server.AgentSystem.getClass

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference
import scala.concurrent.{ExecutionContext, Future, Promise}
import scala.util.{Failure, Success, Try}

object Server {
  private val logger = LoggerFactory.getLogger(getClass)

  type ConnectionId = String
  type Reason = String
  type Login = String
  type Password = String

  object AgentSystem {

    def create(
      defaultConfigs: Map[String, String],
      stateManager: AgentStateManager
    ): AgentSystem = {
      val agentDatas = new ConcurrentHashMap[(Login, Password), AgentState]()
      stateManager.read() match {
        case Failure(exception) =>
          logger.error("Can not load agents state: ", exception)

        case Success(states) =>
          states.foreach { state =>
            val settings = new ConcurrentHashMap[String, String]()
            state.settings.foreach {
              case (key, value) => settings.put(key, value)
            }
            val agentState = new AgentState(state.name, state.login, state.password, settings)
            agentDatas.put((state.login, state.password), agentState)
          }
      }
      val activeConnections = new ConcurrentHashMap[ConnectionId, ActiveConnection]()
      new AgentSystem(agentDatas, activeConnections, stateManager, defaultConfigs)
    }
  }

  final class AgentSystem(
    agentDatas: ConcurrentHashMap[(Login, Password), AgentState],
    activeConnections: ConcurrentHashMap[ConnectionId, ActiveConnection],
    stateManager: AgentStateManager,
    defaultConfigs: Map[String, String],
  ) {
    import scala.jdk.CollectionConverters._

    private def generateData(name: String): AgentState = {
      val login = UUID.randomUUID().toString
      val password = UUID.randomUUID().toString
      val settings = new ConcurrentHashMap[String, String]()
      defaultConfigs.foreach {
        case (key, value) => settings.put(key, value)
      }
      AgentState(name, login, password, settings)
    }

    def dumpState(): Try[Unit] = {
      val datas = agentDatas.values().asScala.toList.map(_.toPersistentView)
      stateManager.write(datas)
    }

    def getConnection(connectionId: String): Option[ActiveConnection] = {
      Option(activeConnections.get(connectionId))
    }

    def removeConnection(connectionId: String): Unit = {
      activeConnections.remove(connectionId)
    }

    def getData(login: Login, password: Password): Option[AgentState] = {
      Option(agentDatas.get(login -> password))
    }

    def getAllActiveConnections(): Map[String, ActiveConnection] = {
      activeConnections.asScala.toMap
    }

    def newConnection(
      connectionId: ConnectionId,
      name: String,
      sendToAgent: RegistryMessage => Unit,
      loginOpt: Option[Login],
      passwordOpt: Option[Password],
    ): (Login, Password) = {
      val credentials = for {
        login <- loginOpt
        password <- passwordOpt
      } yield {
        (login, password)
      }

      val agentData = credentials match {
        case Some((login, password)) =>
          val agentData = agentDatas.get((login, password))
          if (agentData == null) {
            generateData(name)
          } else {
            agentData.copy(name = name)
          }

        case None => generateData(name)
      }

      agentDatas.put((agentData.login, agentData.password), agentData)

      dumpState() match {
        case Failure(exception) =>
          logger.error("Can not dump state, keeping in memory", exception)

        case Success(()) =>
          logger.debug("State successfully dumped")
      }

      val agentState = new ActiveConnection(
        name = name,
        statusRef = new AtomicReference[String]("Status unknown"),
        sendToAgent = sendToAgent,
        requests = new ConcurrentHashMap[String, Promise[Map[String, String]]]()
      )

      activeConnections.put(connectionId, agentState)

      (agentData.login, agentData.password)
    }
  }

  final case class AgentState(
    name: String,
    login: String,
    password: String,
    private val settings: ConcurrentHashMap[String, String]
  ) {
    def getSettings(keys: String*): Map[String, String] = {
      keys.flatMap(k => Option(settings.get(k)).map(k -> _)).toMap
    }

    def setSettings(values: Map[String, String]): Unit = {
      values.foreach {
        case (key, value) => settings.put(key, value)
      }
    }

    def toPersistentView: AgentStateManager.PersistentAgentState = {
      import scala.jdk.CollectionConverters._
      val s = settings.entrySet().asScala.map(e => e.getKey -> e.getValue).toMap
      AgentStateManager.PersistentAgentState(name, login, password, s)
    }
  }
  // fixme: separate `Client` and `Agent` interfaces
  final class ActiveConnection(
    val name: String,
    private val statusRef: AtomicReference[String],
    private val sendToAgent: RegistryMessage => Unit,
    private val requests: ConcurrentHashMap[String, Promise[Map[String, String]]],
  ) {
    def updateStatus(status: String): String = {
      statusRef.updateAndGet(_ => status)
    }

    def status: String = statusRef.get()

    def join(name: String, settings: Map[String, String])(
      implicit ec: ExecutionContext
    ): Future[Map[String, String]] = {
      val requestId = UUID.randomUUID().toString
      val p = Promise[Map[String, String]]
      requests.put(requestId, p)
      sendToAgent(clientJoinMessage(name, settings, requestId))
      val f = p.future
      f.foreach(_ => requests.remove(requestId))
      f.recover(_ => requests.remove(requestId))
      f
    }

    def success(requestId: String, settings: Map[String, String]): Boolean = {
      val promise = requests.get(requestId)
      if (promise != null) {
        promise.trySuccess(settings)
      } else {
        false
      }
    }

    def fail(requestId: String, reason: String): Boolean = {
      val promise = requests.get(requestId)
      if (promise != null) {
        promise.tryFailure(new RuntimeException(reason))
      } else {
        false
      }
    }
  }

  private def clientJoinMessage(name: String, settings: Map[String, String], requestId: String) = {
    RegistryMessage(
      RegistryMessage.Message.Connected(
        RegistryMessage.Connected(name, settings, requestId)
      )
    )
  }
}
