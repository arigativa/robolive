package robolive.gstreamer

object PipelineDescription {
  def description(
    restreamType: RestreamType,
    rtmpLink: Option[String],
    videoSource: String
  ): String = {
    val restreamDescription = restreamType match {
      case RestreamType.Local =>
        "t. ! queue ! videoscale ! video/x-raw,width=640,height=480 ! videoconvert ! autovideosink"

      case RestreamType.None => "t. ! queue ! fakesink"

      case RestreamType.RTMP =>
        assert(
          rtmpLink.nonEmpty,
          "Can not start RTMP restream without link. Provide: `RTMP_LINK` environment variable."
        )
        s"""t. ! queue name=rtmp_sink_queue ! vp8dec
           |  ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency
           |  ! video/x-h264,profile=main
           |  ! flvmux streamable=true name=mux
           |  ! rtmpsink location="${rtmpLink.get} app=live2"
           |audiotestsrc !
           |  voaacenc bitrate=128000 !
           |  mux.""".stripMargin
    }
    s"""$videoSource ! queue ! vp8enc deadline=1 ! tee name=t
       |$restreamDescription""".stripMargin
  }

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
