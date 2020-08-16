package robolive.call

import java.util.concurrent.CountDownLatch

import org.freedesktop.gstreamer._
import robolive.{SIPCallEventHandler, ServoController, SipConfig, WebRTCController}
import robolive.gstreamer.GstManaged

import scala.concurrent.ExecutionContext

object SipWebrtcPuppet {
  def run(
    robotName: String,
    videoSrc: String,
    sipConfig: SipConfig,
  )(implicit ec: ExecutionContext) = {

    val latch = new CountDownLatch(1)

    implicit val gstInit: GstManaged.GSTInit.type = GstManaged(robotName, new Version(1, 14))

    val servoController = ServoController.makePythonShellServoController

    val controller = new WebRTCController(
      videoSrc = videoSrc,
      stunServerUrl = "stun://rl.arigativa.ru:8080",
      servoController = servoController,
    )
    val sipEventsHandler = new SIPCallEventHandler(controller)

    latch.await()
  }
}
