package robolive.registry

import java.util.concurrent.TimeUnit

import io.grpc.{ManagedChannel, ManagedChannelBuilder}
import org.slf4j.LoggerFactory

import scala.util.{Try, Using}

object Clients {

  private val log = LoggerFactory.getLogger(Clients.getClass)

  private implicit val grpcChannelReleasable: Using.Releasable[ManagedChannel] =
    (resource: ManagedChannel) => {
      resource.shutdown()
      resource.awaitTermination(3, TimeUnit.SECONDS)
      resource.shutdownNow()
      resource.awaitTermination(1, TimeUnit.SECONDS)
      if (!resource.isTerminated) {
        log.warn(s"Can't terminate GRPC channel $resource")
      }
    }

  def grpcChannel[A](host: String, port: Int, usePlaintext: Boolean)(body: ManagedChannel => A): Try[A] = {
    def makeChannel = {
      val chBuilder = ManagedChannelBuilder.forAddress(host, port)
      if (usePlaintext) chBuilder.usePlaintext()
      chBuilder.keepAliveTime(1, TimeUnit.SECONDS)

      chBuilder.build()
    }
    Using(makeChannel)(body)
  }
}
