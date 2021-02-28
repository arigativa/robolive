package robolive.app

import org.freedesktop.gstreamer.{Bus, GstObject, Version}
import org.slf4j.LoggerFactory
import robolive.app.ManagedRobotApp.log
import robolive.gstreamer.{GstManaged, PipelineManaged}
import robolive.puppet.{ClientInputInterpreter, Puppet}

import java.util.concurrent.CountDownLatch
import scala.concurrent.ExecutionContext

object CallPuppetApp extends App {
  private val logger = LoggerFactory.getLogger(getClass.getName)

  implicit val ec: ExecutionContext = ExecutionContext.global

  import org.slf4j.bridge.SLF4JBridgeHandler
  SLF4JBridgeHandler.removeHandlersForRootLogger()
  SLF4JBridgeHandler.install()

  val videoSrc: String = {
    val default =
      "nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert"
    getEnv("VIDEO_SRC", default)
  }
  val robotName: String = getEnv("ROBOT_NAME", "robomachine")
  val signallingUri: String = getEnv("SIGNALLING_SIP_URI", "sip:rl.arigativa.ru:9031")
  val stunUri: String = getEnv("STUN_URI", "stun://rl.arigativa.ru:8080")
  val enableUserVideo: Boolean = sys.env.contains("ENABLE_USER_VIDEO")
  val servoControllerType: String = getEnv("SERVO_CONTROLLER", default = "FAKE")
  val servoController = getEnv("SERVO_CONTROLLER_TYPE", "FAKE") match {
    case "SERIAL" =>
      new ClientInputInterpreter.ClientInputInterpreterImpl(log)
    case "FAKE" => new ClientInputInterpreter.FakeClientInputInterpreter(log)
  }
  implicit val gstInit: GstManaged.GSTInit.type =
    GstManaged(robotName, new Version(1, 14))

  val pipelineDescription =
    s"""$videoSrc ! queue ! tee name=t
       |t. ! queue ! videoscale ! video/x-raw,width=640,height=480 ! videoconvert ! autovideosink
       |t. ! queue name=rtpVideoSrc""".stripMargin

  val pipeline = PipelineManaged(
    name = "robolive-robot-pipeline",
    description = pipelineDescription,
  )

  def initBus(bus: Bus): Unit = {
    val eosHandler: Bus.EOS =
      (source: GstObject) => logger.info(s"EOS ${source.getName}")

    val errorHandler: Bus.ERROR = (source: GstObject, code: Int, message: String) =>
      logger.error(s"Error ${source.getName}: $code $message")

    bus.connect(eosHandler)
    bus.connect(errorHandler)
  }

  initBus(pipeline.getBus)

  val puppet = new Puppet(
    pipeline = pipeline,
    sipRobotName = robotName,
    signallingUri = signallingUri,
    stunUri = stunUri,
    enableUserVideo = enableUserVideo,
    clientInputInterpreter = servoController,
    eventListener = () => (),
    gstInit = gstInit,
  )

  val kill = new CountDownLatch(1)

  sys.addShutdownHook {
    logger.info(s"Stopping $robotName")
    puppet.stop()
    kill.countDown()
  }

  puppet.start()

  logger.info(s"Stopped $robotName")
}
