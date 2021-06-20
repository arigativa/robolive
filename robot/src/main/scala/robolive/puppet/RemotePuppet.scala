package robolive.puppet

import Puppet.Command.Command
import Puppet.{PuppetControllerGrpc, PuppetOutput}
import io.grpc.stub.StreamObserver
import robolive.managed.Clients

import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.{Future, Promise}

class RemotePuppet(ip: String, port: Int) extends AutoCloseable {

  private val channel = Clients.makeChannel(ip, port, usePlaintext = true)
  private val puppetController = PuppetControllerGrpc.stub(channel)

  private val commandResponsePromises =
    new ConcurrentHashMap[String, (Instant, Promise[PuppetOutput])]()

  private val commandsObserver: StreamObserver[Puppet.Command] =
    puppetController.execute(new StreamObserver[PuppetOutput] {
      override def onNext(value: PuppetOutput): Unit = {
        value.commandID.foreach { cmdId =>
          commandResponsePromises.get(cmdId) match {
            case null =>
            case (_, promise) => promise.success(value)
          }
        }
      }

      override def onError(t: Throwable): Unit = {}

      override def onCompleted(): Unit = {}
    })

  override def close(): Unit = {
    commandsObserver.onCompleted()
    channel.shutdown()
  }

  def runCommand(command: Command): Future[PuppetOutput] = {
    val commandId = UUID.randomUUID().toString
    val promise = Promise[PuppetOutput]()
    commandResponsePromises.put(commandId, (Instant.now(), promise))
    commandsObserver.onNext(Puppet.Command.of(Some(commandId), command))
    promise.future
  }

}
