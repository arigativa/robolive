package robolive.server

import Agent.RegistryMessage

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference
import scala.concurrent.{ExecutionContext, Future, Promise}

object Server {
  type ConnectionId = String
  type Reason = String
  type Login = String
  type Password = String

  object AgentSystem {
    def create(defaultConfigs: Map[String, String]): AgentSystem = {
      val agentDatas = new ConcurrentHashMap[(Login, Password), AgentState]()
      val activeConnections = new ConcurrentHashMap[ConnectionId, ActiveConnection]()
      new AgentSystem(agentDatas, activeConnections, defaultConfigs)
    }
  }

  final class AgentSystem(
    agentDatas: ConcurrentHashMap[(Login, Password), AgentState],
    activeConnections: ConcurrentHashMap[ConnectionId, ActiveConnection],
    defaultConfigs: Map[String, String],
  ) {

    private def generateData(name: String): AgentState = {
      val login = UUID.randomUUID().toString
      val password = UUID.randomUUID().toString
      val settings = new ConcurrentHashMap[String, String]()
      defaultConfigs.foreach {
        case (key, value) => settings.put(key, value)
      }
      new AgentState(name, login, password, settings)
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
      import scala.jdk.CollectionConverters._
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
            agentData
          }

        case None => generateData(name)
      }

      agentDatas.put((agentData.login, agentData.password), agentData)

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

  // fixme: rename to agent state
  final class AgentState(
    val name: String,
    val login: String,
    val password: String,
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

  }

  // fixme: separate `Client` and `Agent` interfaces
  // rename to agent connection
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
