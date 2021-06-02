package sdp

object Test extends App {
  val rawSdp =
    """v=0
     |o=- 4370282919448584608 2 IN IP4 127.0.0.1
     |s=-
     |t=0 0
     |a=group:BUNDLE 0
     |a=extmap-allow-mixed
     |a=msid-semantic: WMS 9bf06c31-2337-4f2b-9982-8d3204a8b243
     |m=video 46076 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 121 127 120 125 107 108 109 35 36 124 119 123
     |c=IN IP4 52.136.233.255
     |a=rtcp:46022 IN IP4 52.136.233.255
     |a=candidate:1840965416 1 udp 2113937151 7b4a5f84-1a2f-4b79-a360-9f9a649a0e1e.local 38183 typ host generation 0 network-cost 999
     |a=candidate:1840965416 2 udp 2113937150 7b4a5f84-1a2f-4b79-a360-9f9a649a0e1e.local 47483 typ host generation 0 network-cost 999
     |a=candidate:842163049 1 udp 1677729535 37.194.191.140 38183 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999
     |a=candidate:842163049 2 udp 1677729534 37.194.191.140 47483 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999
     |a=candidate:205451522 2 udp 33562366 52.136.233.255 46022 typ relay raddr 37.194.191.140 rport 47483 generation 0 network-cost 999
     |a=candidate:205451522 1 udp 33562367 52.136.233.255 46076 typ relay raddr 37.194.191.140 rport 38183 generation 0 network-cost 999
     |a=ice-ufrag:csua
     |a=ice-pwd:dj8Uv7IhPo1CzoJB9oz7AAys
     |a=ice-options:trickle
     |a=fingerprint:sha-256 42:4B:22:10:49:9B:35:FC:3F:FF:B5:22:46:87:8F:22:DB:B0:A7:0C:11:BB:58:4C:C3:CD:3B:B1:F9:AD:66:49
     |a=setup:actpass
     |a=mid:0
     |a=extmap:1 urn:ietf:params:rtp-hdrext:toffset
     |a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
     |a=extmap:3 urn:3gpp:video-orientation
     |a=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
     |a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
     |a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
     |a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
     |a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
     |a=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid
     |a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
     |a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
     |a=sendrecv
     |a=msid:9bf06c31-2337-4f2b-9982-8d3204a8b243 645ecf9e-1fd0-40d1-aff4-c52894ee872c
     |a=rtcp-mux
     |a=rtcp-rsize
     |a=rtpmap:96 VP8/90000
     |a=rtcp-fb:96 goog-remb
     |a=rtcp-fb:96 transport-cc
     |a=rtcp-fb:96 ccm fir
     |a=rtcp-fb:96 nack
     |a=rtcp-fb:96 nack pli
     |a=rtpmap:97 rtx/90000
     |a=fmtp:97 apt=96
     |a=rtpmap:98 VP9/90000
     |a=rtcp-fb:98 goog-remb
     |a=rtcp-fb:98 transport-cc
     |a=rtcp-fb:98 ccm fir
     |a=rtcp-fb:98 nack
     |a=rtcp-fb:98 nack pli
     |a=fmtp:98 profile-id=0
     |a=rtpmap:99 rtx/90000
     |a=fmtp:99 apt=98
     |a=rtpmap:100 VP9/90000
     |a=rtcp-fb:100 goog-remb
     |a=rtcp-fb:100 transport-cc
     |a=rtcp-fb:100 ccm fir
     |a=rtcp-fb:100 nack
     |a=rtcp-fb:100 nack pli
     |a=fmtp:100 profile-id=2
     |a=rtpmap:101 rtx/90000
     |a=fmtp:101 apt=100
     |a=rtpmap:102 H264/90000
     |a=rtcp-fb:102 goog-remb
     |a=rtcp-fb:102 transport-cc
     |a=rtcp-fb:102 ccm fir
     |a=rtcp-fb:102 nack
     |a=rtcp-fb:102 nack pli
     |a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
     |a=rtpmap:121 rtx/90000
     |a=fmtp:121 apt=102
     |a=rtpmap:127 H264/90000
     |a=rtcp-fb:127 goog-remb
     |a=rtcp-fb:127 transport-cc
     |a=rtcp-fb:127 ccm fir
     |a=rtcp-fb:127 nack
     |a=rtcp-fb:127 nack pli
     |a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
     |a=rtpmap:120 rtx/90000
     |a=fmtp:120 apt=127
     |a=rtpmap:125 H264/90000
     |a=rtcp-fb:125 goog-remb
     |a=rtcp-fb:125 transport-cc
     |a=rtcp-fb:125 ccm fir
     |a=rtcp-fb:125 nack
     |a=rtcp-fb:125 nack pli
     |a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
     |a=rtpmap:107 rtx/90000
     |a=fmtp:107 apt=125
     |a=rtpmap:108 H264/90000
     |a=rtcp-fb:108 goog-remb
     |a=rtcp-fb:108 transport-cc
     |a=rtcp-fb:108 ccm fir
     |a=rtcp-fb:108 nack
     |a=rtcp-fb:108 nack pli
     |a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
     |a=rtpmap:109 rtx/90000
     |a=fmtp:109 apt=108
     |a=rtpmap:35 AV1X/90000
     |a=rtcp-fb:35 goog-remb
     |a=rtcp-fb:35 transport-cc
     |a=rtcp-fb:35 ccm fir
     |a=rtcp-fb:35 nack
     |a=rtcp-fb:35 nack pli
     |a=rtpmap:36 rtx/90000
     |a=fmtp:36 apt=35
     |a=rtpmap:124 red/90000
     |a=rtpmap:119 rtx/90000
     |a=fmtp:119 apt=124
     |a=rtpmap:123 ulpfec/90000
     |a=ssrc-group:FID 3562348850 1273747165
     |a=ssrc:3562348850 cname:VIHA9unqptpis1x1
     |a=ssrc:3562348850 msid:9bf06c31-2337-4f2b-9982-8d3204a8b243 645ecf9e-1fd0-40d1-aff4-c52894ee872c
     |a=ssrc:3562348850 mslabel:9bf06c31-2337-4f2b-9982-8d3204a8b243
     |a=ssrc:3562348850 label:645ecf9e-1fd0-40d1-aff4-c52894ee872c
     |a=ssrc:1273747165 cname:VIHA9unqptpis1x1
     |a=ssrc:1273747165 msid:9bf06c31-2337-4f2b-9982-8d3204a8b243 645ecf9e-1fd0-40d1-aff4-c52894ee872c
     |a=ssrc:1273747165 mslabel:9bf06c31-2337-4f2b-9982-8d3204a8b243
     |a=ssrc:1273747165 label:645ecf9e-1fd0-40d1-aff4-c52894ee872c
     |""".stripMargin

  val sdp = SdpMessage(rawSdp)

  val updatedSdp = sdp.map { message =>
    val updatedAttrs = message.media.head.a.filterNot { attr =>
      attr.name == "candidate" && !attr.valueOpt.exists(_.contains("52.136.233.255"))
    }
    message.copy(media = Seq(message.media.head.copy(a = updatedAttrs)))
  }

  println(updatedSdp)
  println(sdp)
}
