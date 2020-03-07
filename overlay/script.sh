#!/bin/bash

export DISPLAY=:19
Xvfb :19 -screen 0 1280x720x16 &

if [ -z "$RTMP_TARGET" ]; then
  echo "RTMP_TARGET is not set"
  exit 1
fi

if [ -z "$HUD_URL" ]; then
  echo "HUD_URL is not set"
  exit 1
fi

export HUD_PIPELINE=${HUD_PIPELINE:-"alpha method=set alpha=0.5"}

function streamTestVideoWithOverlay() {
  gst-launch-1.0 \
          videotestsrc is-live=1 \
          ! videoconvert \
          ! "video/x-raw, width=1280, height=720, framerate=25/1" \
          ! mixer.sink_0 \
              webkitsrc url="$HUD_URL" fps=25 \
              ! "video/x-raw, format=RGBA, width=1280, height=720" \
              ! $HUD_PIPELINE \
              ! mixer.sink_1 \
          videomixer name=mixer sink_0::zorder=0 sink_1::zorder=1 \
          ! videoconvert \
          ! queue \
          ! x264enc bitrate=2048 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency ! "video/x-h264,profile=main" \
          ! flvmux streamable=true name=mux \
          ! rtmpsink location="$RTMP_TARGET" \
          audiotestsrc \
          ! voaacenc bitrate=128000 \
          ! mux.
}

export MAX_KEYFRAME=75 # 3 seconds by 25 frames (YouTube recommends lower than 4 sec)

function streamTestVideo() {
  gst-launch-1.0 -q \
    webkitsrc url=$HUD_URL fps=25 \
    ! video/x-raw, format=RGBA, framerate=25/1, width=1280, height=720 \
    ! videoconvert \
    ! x264enc bitrate=1024 aud=true key-int-max=$MAX_KEYFRAME tune=zerolatency \
    ! "video/x-h264,profile=main" \
    ! flvmux streamable=true name=mux \
    ! rtmpsink location="$RTMP_TARGET" \
    audiotestsrc freq=60 is-live=true \
          ! voaacenc bitrate=128000 \
          ! mux.
}

streamTestVideoWithOverlay

# GST_DEBUG=*webkit*:5 gst-launch-1.0 webkitsrc url=http://localhost/news/ ! video/x-raw, format=RGBA, framerate=25/1, width=1280, height=720 ! videoconvert ! xvimagesink sync=FALSE

# GST_DEBUG=*webkit*:5 gst-launch-1.0 videotestsrc ! video/x-raw, format=RGBA, width=1280, height=720 ! mixer.sink_0   webkitsrc  url="http://localhost/news/" ! video/x-raw, format=RGBA, width=1280, height=720 ! alpha method=green ! mixer.sink_1   videomixer name=mixer sink_0::zorder=0 sink_1::zorder=1 !   videoconvert ! autovideosink sync=FALSE
        
#        
#gst-launch-1.0 videotestsrc is-live=1 ! videoconvert ! "video/x-raw, width=1280, height=720, framerate=25/1" ! queue ! x264enc bitrate=2000 byte-stream=false key-int-max=60 bframes=0 aud=true tune=zerolatency ! "video/x-h264,profile=main" ! flvmux streamable=true name=mux  ! rtmpsink location="rtmp://a.rtmp.youtube.com/live2/x/sm10-ud24-dahj-4fu5 app=live2" audiotestsrc ! voaacenc bitrate=128000 ! mux.
