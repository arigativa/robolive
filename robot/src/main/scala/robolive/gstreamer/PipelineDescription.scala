package robolive.gstreamer

object PipelineDescription {
  def description(
    restreamType: RestreamType,
    rtmpLink: Option[String],
    videoSource: String
  ): String = {
    val restreamDescription = restreamType match {
      case RestreamType.Local =>
        "t. ! queue ! h264parse ! avdec_h264 ! autovideosink"

      case RestreamType.None => "t. ! queue ! fakesink"

      case RestreamType.RTMP =>
        assert(
          rtmpLink.nonEmpty,
          "Can not start RTMP restream without link. Provide: `RTMP_LINK` environment variable."
        )
        s"""t. ! queue name=rtmp_sink_queue
           |  ! video/x-h264,profile=main
           |  ! flvmux streamable=true name=mux
           |  ! rtmpsink location="${rtmpLink.get} app=live2"
           |audiotestsrc wave=silence !
           |  voaacenc bitrate=1024 !
           |  mux.""".stripMargin
    }

    // UDP RTP pipeline
    // (!!) already encoded
    // udpsrc ! application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96 ! rtph264depay

    val Vp8enc = "vp8enc deadline=1"
    val GPUPoweredH264 = "omxh264enc"
    val GenericH264 =
      "x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency"

    s"""$videoSource ! queue
       ! $GenericH264
       | ! tee name=t
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
