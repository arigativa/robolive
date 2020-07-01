package robolive.server

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

import io.grpc.stub.StreamObserver
import robolive.protocols.Inventory.RegistryInventoryGrpc.RegistryInventory
import robolive.protocols.Inventory.{RobotStatus, Command => RobotCommand}
import robolive.protocols.Robot.RobotID
import robolive.server.RobotRegistry.SendCommand

class RobotRegistry(
                     robotTable: ConcurrentHashMap[RobotID, (RobotStatus, SendCommand)],
                   ) extends RegistryInventory {


  override def join(commands: StreamObserver[RobotCommand]): StreamObserver[RobotStatus] = {

    val statusReceiver: StreamObserver[RobotStatus] = new StreamObserver[RobotStatus] {
      private val lastKnownId = new AtomicReference[RobotID]()

      // todo send initial command (listen to sip call)
      override def onNext(status: RobotStatus): Unit = {
        val id = status.description.id
        lastKnownId.updateAndGet(previousId => {
          if (previousId != null) {
            if (previousId != id) {
              commands.onError(new RuntimeException(s"unexpected id change: from $previousId to $id"))
            }
          }
          id
        })
        robotTable.put(id, (status, commands.onNext))
      }
      override def onError(error: Throwable): Unit = {
        lastKnownId.get() match {
          case null =>
          case id =>
            robotTable.remove(id)
            commands.onError(error)
        }
      }
      override def onCompleted(): Unit = {
        lastKnownId.get() match {
          case null =>
          case id =>
            robotTable.remove(id)
            commands.onCompleted()
        }
      }
    }

    statusReceiver
  }

}

object RobotRegistry {

  type SendCommand = RobotCommand => Unit
}
