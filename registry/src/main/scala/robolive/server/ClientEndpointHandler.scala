package robolive.server
import java.util.concurrent.ConcurrentHashMap

import Agent.RegistryMessage
import Client.{JoinRequest, JoinResponse}

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
        val tryingState = AgentState.Trying(name, resultPromise)
        robotTable.put(request.targetId, tryingState)
        callback(
          RegistryMessage(
            RegistryMessage.Message.Connected(
              RegistryMessage.Connected(request.name, request.settings)
            )
          )
        )
      case null | _ =>
        resultPromise.failure(new RuntimeException(s"agent with ${request.targetId} not found"))
    }

    resultPromise.future.map { settings =>
      robotTable.put(request.targetId, state)
      JoinResponse(
        Client.JoinResponse.Message
          .Success(Client.JoinResponse.Success(settings))
      )
    }
  }
}
