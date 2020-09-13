package robolive.server
import Storage.{ReadRequest, ReadResponse}
import Storage.StorageEndpointGrpc.StorageEndpoint

import scala.concurrent.{ExecutionContext, Future}

final class StorageEndpointHandler(
  configMap: Map[String, String],
)(implicit ec: ExecutionContext)
    extends StorageEndpoint {
  def get(request: ReadRequest): Future[ReadResponse] = {
    Future {
      val settings =
        request.keys
          .flatMap(key => configMap.get(key).map(setting => key -> setting))
          .toMap
      ReadResponse(settings)
    }
  }
}
