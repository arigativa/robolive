package robolive.gstreamer

final class PipelineDescription(private val isRestreamEnabled: Boolean) {
  def description(videoSource: String): String = {
    if (isRestreamEnabled) {
      s"""$videoSource ! queue ! tee name=t
         |t. ! queue ! videoscale ! video/x-raw,width=640,height=480 ! videoconvert ! autovideosink""".stripMargin
    } else {
      s"""$videoSource ! queue ! tee name=t
         |t. ! queue ! fakesink""".stripMargin
    }
  }
}
