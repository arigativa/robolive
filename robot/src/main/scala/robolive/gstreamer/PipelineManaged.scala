package robolive.gstreamer

import org.freedesktop.gstreamer.{Gst, Pipeline}
import robolive.gstreamer.GstManaged.GSTInit

object PipelineManaged {
  def apply(name: String, description: String)(implicit ev: GSTInit.type): Pipeline = {
    val process = Gst.parseBinFromDescription(description, false)
    val pipeline = new Pipeline(name)
    val added = pipeline.add(process)
    assert(added, "Can not add bin to pipeline")
    pipeline
  }
}
