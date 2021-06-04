package agent

import Puppet.PuppetControllerGrpc.PuppetController
import Puppet.{Command, PuppetControllerGrpc, PuppetOutput}
import agent.control.ClientInputInterpreter
import gstmanaged.managed.{GstManaged, PipelineManaged}
import io.grpc.ServerBuilder
import io.grpc.stub.StreamObserver
import org.freedesktop.gstreamer.{Pipeline, State, Version}
import org.slf4j.LoggerFactory

import scala.concurrent.ExecutionContext

object AgentApp extends App {

  private val Port = 7777

  private val logger = LoggerFactory.getLogger(getClass)

  private val servoController = getEnv("SERVO_CONTROLLER_TYPE", "FAKE") match {
    case "SERIAL" =>
      new ClientInputInterpreter.ClientInputInterpreterImpl(logger)

    case "FAKE" => new ClientInputInterpreter.FakeClientInputInterpreter(logger)
  }

  implicit val gstInit: GstManaged.GSTInit.type =
    GstManaged("jetson-agent", new Version(1, 14))

  trait GstreamerPipelineManager {
    def updatePipeline(description: String, errorLog: String => Unit): State
  }

  object RunningPipeline extends GstreamerPipelineManager {

    private var currentPipeline: Option[Pipeline] = None

    def updatePipeline(description: String, errorLog: String => Unit): State = {
      RunningPipeline.synchronized {
        currentPipeline.foreach { p =>
          p.stop()
          p.dispose()
          p.close()
        }
        val newPipeline =
          PipelineManaged(
            name = "puppet-pipeline",
            description = description,
            logger = (message: String) => errorLog(message),
          )
        newPipeline.ready()
        newPipeline.play()
        currentPipeline = Some(newPipeline)
        newPipeline.getState
      }
    }
  }

  class JetsonPuppetController(
    clientInputInterpreter: ClientInputInterpreter,
    gstPipelineMgr: GstreamerPipelineManager
  ) extends PuppetController {

    override def execute(
      responseObserver: StreamObserver[PuppetOutput]
    ): StreamObserver[Command] = {
      new StreamObserver[Command] {
        override def onNext(command: Command): Unit = {
          command.command match {
            case Command.Command.Empty =>
            case Command.Command.GstPipeline(newPipeline) =>
              val state = gstPipelineMgr.updatePipeline(newPipeline.description, error => {
                responseObserver.onNext(PuppetOutput(commandID = command.id, log = Some(error)))
              })
              responseObserver.onNext(
                PuppetOutput(
                  commandID = command.id,
                  log = Some(s"pipeline updated, state: ${state.name()}")
                )
              )
            case Command.Command.ClientCommand(clCommand) =>
              val output = clientInputInterpreter.clientInput(clCommand.command)
              responseObserver.onNext(PuppetOutput(commandID = command.id, log = Some(output)))
          }
        }

        override def onError(t: Throwable): Unit = {
          logger.error("received error", t)
          responseObserver.onCompleted()
        }

        override def onCompleted(): Unit = {
          responseObserver.onCompleted()
        }
      }
    }
  }

  import ExecutionContext.Implicits.global

  private val serverBuilder =
    ServerBuilder
      .forPort(Port)
      .addService(
        PuppetControllerGrpc.bindService(
          new JetsonPuppetController(servoController, RunningPipeline),
          implicitly[ExecutionContext]
        )
      )
      .asInstanceOf[ServerBuilder[_]]
  private val server = serverBuilder.build.start
  logger.info(s"serving PuppetController on port $Port")
  server.awaitTermination()
}
