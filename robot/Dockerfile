FROM maxmcd/gstreamer:1.14-buster
RUN apt-get --allow-releaseinfo-change update
WORKDIR /code
RUN apt-get update
RUN apt-get install -y python3-pip \
pkg-config \
libcairo2-dev \
gcc \
python3-dev \
libgirepository1.0-dev \
python-gst-1.0 \
gir1.2-gst-plugins-bad-1.0 \
gstreamer1.0-plugins-bad \
gstreamer1.0-plugins-good \
gstreamer1.0-nice

COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["/usr/bin/python3", "./robot.py"]