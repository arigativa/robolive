FROM openjdk:9

RUN apt-get --allow-releaseinfo-change update

RUN apt update && apt install -y \
    gstreamer1.0-tools \
    gstreamer1.0-nice \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad gir1.2-gst-plugins-bad-1.0

ADD target/universal/robot-1.0.tgz /robot

RUN sh -c '[ -d /robot/ ] || ( echo "Package was not extracted by Docker properly" && exit 1 )'

CMD /robot/robot-1.0/bin/robot
