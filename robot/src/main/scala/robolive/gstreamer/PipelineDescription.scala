package robolive.gstreamer

import robolive.gstreamer.PipelineDescription.RestreamType

final class PipelineDescription(private val restreamType: RestreamType, rtmpLink: Option[String]) {
  def description(videoSource: String): String = {
    val restreamDescription = restreamType match {
      case RestreamType.Local =>
        "t. ! queue ! videoscale ! video/x-raw,width=640,height=480 ! videoconvert ! autovideosink"

      case RestreamType.None => "t. ! queue ! fakesink"

      case RestreamType.RTMP =>
        assert(
          rtmpLink.nonEmpty,
          "Can not start RTPM restream without link. Provide: `RTPM_LINK` environment variable."
        )
        s"""t. ! queue ! 
         |  x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency !
         |  video/x-h264,profile=main !
         |  flvmux streamable=true name=mux !
         |  rtmpsink location="${rtmpLink.get} app=live2"
         |audiotestsrc !
         |  voaacenc bitrate=128000 !
         |  mux.""".stripMargin
    }
    s"""$videoSource ! queue ! tee name=t
         |$restreamDescription""".stripMargin
  }
}

object PipelineDescription {
  trait RestreamType
  object RestreamType {
    case object None extends RestreamType
    case object RTMP extends RestreamType
    case object Local extends RestreamType

    def fromUnsafe(raw: String): RestreamType = {
      raw.toLowerCase match {
        case "none" => None
        case "rtmp" => RTMP
        case "local" => Local
        case _ => throw new RuntimeException(s"Unknown RestreamType: `$raw`")
      }
    }
  }
}
