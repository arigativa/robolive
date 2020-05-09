FROM debian:bullseye
RUN apt-get --allow-releaseinfo-change update
WORKDIR /code

RUN apt update

RUN apt install -y python3-pip python3-dev
RUN apt install -y libcairo2-dev gcc

RUN apt install -y python-gst-1.0 libgirepository1.0-dev
RUN apt install -y gstreamer1.0-nice gstreamer1.0-plugins-good \
                   gstreamer1.0-plugins-bad gir1.2-gst-plugins-bad-1.0

COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["/usr/bin/python3", "./robot.py"]