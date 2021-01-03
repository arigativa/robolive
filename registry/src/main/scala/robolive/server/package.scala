package robolive

import Agent.RegistryMessage

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference
import scala.concurrent.{ExecutionContext, Future, Promise}

package object server {
  type AgentChannel = RegistryMessage => Unit
  type Reason = String

  // fixme: separate `Client` and `Agent` interfaces
  final class AgentState(
    val name: String,
    private val statusRef: AtomicReference[String],
    callback: AgentChannel,
    requests: ConcurrentHashMap[String, Promise[Map[String, String]]],
  ) {
    def updateStatus(status: String): String = {
      statusRef.updateAndGet(_ => status)
    }

    def status: String = statusRef.get()

    def send(name: String, settings: Map[String, String])(
      implicit ec: ExecutionContext
    ): Future[Map[String, String]] = {
      val requestId = UUID.randomUUID().toString
      val p = Promise[Map[String, String]]
      requests.put(requestId, p)
      callback(clientJoinMessage(name, settings, requestId))
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
