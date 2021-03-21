package robolive.server

import Common.Empty
import Storage.{ReadRequest, ReadResponse, WriteRequest}
import Storage.StorageEndpointGrpc.StorageEndpoint
import robolive.server.Server.AgentSystem

import scala.concurrent.{ExecutionContext, Future}

final class StorageEndpointHandler(
  agentSystem: AgentSystem,
)(implicit ec: ExecutionContext)
    extends StorageEndpoint {
  def get(request: ReadRequest): Future[ReadResponse] = {
    agentSystem.getData(request.login, request.password) match {
      case Some(data) =>
        Future.successful(ReadResponse(data.getSettings(request.keys: _*)))
      case None =>
        Future.failed(new RuntimeException("Can not find any values for given keys for agent"))
    }
  }

  def set(request: WriteRequest): Future[Empty] = {
    agentSystem.getData(request.login, request.password) match {
      case Some(data) =>
        data.setSettings(request.values)
        Future.successful(Common.Empty())
      case None =>
        Future.failed(new RuntimeException("Can not find any values for given keys for agent"))
    }
  }
}
