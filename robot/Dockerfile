FROM openjdk:11

RUN apt-get --allow-releaseinfo-change update

RUN apt update && apt install -y \
    gstreamer1.0-tools \
    gstreamer1.0-nice \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad gir1.2-gst-plugins-bad-1.0

COPY target/universal/robot-1.0.tgz /robot-1.0.tgz

RUN tar -zxvf robot-1.0.tgz

RUN sh -c 'test -d /robot-1.0/ || ( echo "Package was not extracted by Docker properly" && exit 1 )'
RUN gst-inspect-1.0 srtp
CMD ["/robot-1.0/bin/robot"]
