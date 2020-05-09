package robolive.gstreamer

import org.freedesktop.gstreamer.Pipeline
import org.freedesktop.gstreamer.webrtc.WebRTCBin
import robolive.gstreamer.GstManaged.GSTInit
import robolive.gstreamer.bindings.GstWebRTCDataChannel
import zio.{Task, UIO, ZManaged}
import zio.console.Console

object WebRTCBinManaged {
  def apply(pipeline: Pipeline, name: String)(
    implicit ev: GSTInit.type
  ): ZManaged[Console, Throwable, WebRTCBin] =
    ZManaged.make(Task {
      val sendrcv = pipeline.getElementByName(name).asInstanceOf[WebRTCBin]
      assert(sendrcv != null, "Can not find sendrecv")
      sendrcv
    })(webrtc => UIO(webrtc.dispose()))

  implicit final class WebRTCBinOps(webRTCBin: WebRTCBin) {
    def createDataChannel(name: String): Option[GstWebRTCDataChannel] = {
      Option(webRTCBin.emit(classOf[GstWebRTCDataChannel], "create-data-channel", name, null))
    }
  }
}
