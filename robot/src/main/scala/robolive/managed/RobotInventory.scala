package robolive.managed

import Inventory.RegistryInventoryGrpc
import io.grpc.ManagedChannelBuilder

object RobotInventory {
  def buildClient(
    host: String,
    port: Int,
    usePlaintext: Boolean
  ): RegistryInventoryGrpc.RegistryInventoryStub = {

    val channelBuilder = ManagedChannelBuilder.forAddress(host, port)
    if (usePlaintext) {
      channelBuilder.usePlaintext()
    }
    val channel = channelBuilder.build()

    RegistryInventoryGrpc.stub(channel)
  }
}
