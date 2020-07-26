package robolive.managed

import io.grpc.ManagedChannelBuilder
import robolive.protocols.Inventory.RegistryInventoryGrpc

object Inventory {
  def buildClient(host: String, port: Int, usePlaintext: Boolean): RegistryInventoryGrpc.RegistryInventoryStub = {

    val channelBuilder = ManagedChannelBuilder.forAddress(host, port)
    if (usePlaintext) {
      channelBuilder.usePlaintext()
    }
    val channel = channelBuilder.build()

    RegistryInventoryGrpc.stub(channel)
  }
}
