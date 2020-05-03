package robolive.gstreamer

import org.freedesktop.gstreamer.{Gst, Version}
import zio.{Task, UIO, ZManaged}

object GstManaged {
  case object GSTInit

  def apply(
    name: String,
    version: Version,
  ): ZManaged[Any, Throwable, GSTInit.type] =
    ZManaged.make(Task {
      Gst.init(version, name)
      Gst.setSegTrap(false)
      GSTInit
    })(_ =>
      UIO {
        Gst.deinit()
        Gst.quit()
      }
    )
}
