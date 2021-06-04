package gstmanaged.managed

import org.freedesktop.gstreamer.{Gst, Version}

object GstManaged {
  case object GSTInit {
    def dispose(): Unit = {
      Gst.deinit()
      Gst.quit()
    }
  }

  def apply(name: String, version: Version): GSTInit.type = {
    Gst.init(version, name)
    Gst.setSegTrap(false)
    GSTInit
  }
}
