package robolive.server
import java.util.concurrent.ConcurrentHashMap
import Agent.RegistryMessage
import Client.{JoinRequest, JoinResponse}

import java.util.UUID
import scala.concurrent.{ExecutionContext, Future, Promise}

final class ClientEndpointHandler(robotTable: ConcurrentHashMap[String, AgentState])(
  implicit ec: ExecutionContext
) extends Client.ClientEndpointGrpc.ClientEndpoint {

  override def join(
    request: JoinRequest
  ): Future[JoinResponse] = {

    val resultPromise = Promise[Map[String, String]]()
    val state = robotTable.get(request.targetId)
    state match {
      case AgentState.Registered(name, callback) =>
        // fixme: encapsulate internal state change
        val tryingState = AgentState.Trying(name, resultPromise)
        robotTable.put(request.targetId, tryingState)
        // fixme: name should be unique
        // more general problem - how the user should be identified
        // also, what is a call identification?
        val requestId = UUID.randomUUID().toString
        callback(clientJoinMessage(request.name, request.settings, requestId))

      // fixme: typing for states?
      case null | _ =>
        resultPromise.failure(new RuntimeException(s"agent with ${request.targetId} not found"))
    }

    resultPromise.future.map { settings =>
      // fixme: registered state even on successful ongoing connection?
      // assumed robot handles all the state?
      // then why serialize access to robot on registry side?
      // maybe just hold registry - agent communication channel?
      robotTable.put(request.targetId, state)
      clientSuccessResponse(settings)
    }.recover {
      case error => clientErrorResponse(error)
    }
  }

  // fixme: shouldn't it be a method on `actor`?
  private def clientJoinMessage(name: String, settings: Map[String, String], requestId: String) = {
    RegistryMessage(
      RegistryMessage.Message.Connected(
        RegistryMessage.Connected(name, settings, requestId)
      )
    )
  }

  private def clientErrorResponse(error: Throwable) = {
    JoinResponse(
      Client.JoinResponse.Message
        .Failure(Client.JoinResponse.Failure(error.getMessage))
    )
  }

  private def clientSuccessResponse(
    settings: Map[String, String]
  ) = {
    JoinResponse(
      Client.JoinResponse.Message
        .Success(Client.JoinResponse.Success(settings))
    )
  }
}
