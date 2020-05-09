FROM openjdk:9

RUN apt-get --allow-releaseinfo-change update

RUN apt update && apt install -y \
    gstreamer1.0-tools \
    gstreamer1.0-nice \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad gir1.2-gst-plugins-bad-1.0