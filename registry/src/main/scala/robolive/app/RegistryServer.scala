package robolive.app

import io.grpc.{ServerBuilder, ServerServiceDefinition}
import robolive.protocols.Inventory.RegistryInventoryGrpc.RegistryInventory
import robolive.protocols.Registry.RegistryOperatorGrpc.RegistryOperator
import robolive.server.RegistryProtoServer

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

object RegistryServer extends App {
  val InventoryPort = 3478
  val OperatorPort = 3479

  val service = new RegistryProtoServer()

  val inventoryServer = runServer(RegistryInventory.bindService(service.inventory, global), InventoryPort)
  val operatorServer = runServer(RegistryOperator.bindService(service.operator, global), OperatorPort)

  Await.result(inventoryServer, Duration.Inf)
  Await.result(operatorServer, Duration.Inf)

  def runServer(ssd: ServerServiceDefinition, port: Int): Future[Unit] =
    Future {
      val serverBuilder = ServerBuilder.forPort(port).addService(ssd).asInstanceOf[ServerBuilder[_]]
      val server = serverBuilder.build.start

      // make sure our server is stopped when jvm is shut down
      Runtime.getRuntime.addShutdownHook(new Thread() {
        override def run(): Unit = server.shutdown()
      })

      server.awaitTermination()
    }
}
