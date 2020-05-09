package robolive.gstreamer
import org.freedesktop.gstreamer.{Gst, Pipeline}
import robolive.gstreamer.GstManaged.GSTInit
import zio.{Task, UIO, ZManaged}
import zio.console.Console

object PipelineManaged {
  def apply(
    name: String,
    description: String
  )(implicit ev: GSTInit.type): ZManaged[Console, Throwable, Pipeline] =
    ZManaged.make(Task {
      val process = Gst.parseBinFromDescription(description, false)
      val pipeline = new Pipeline(name)
      val added = pipeline.add(process)
      assert(added, "Can not add bin to pipeline")
      pipeline
    })(pipeline =>
      UIO {
        pipeline.stop()
        pipeline.dispose()
      }
    )
}
