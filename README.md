# Useful materials

[Introductionary WebRTC article](https://habr.com/ru/company/yandex/blog/419951/)    
[Hole punching explained](https://bford.info/pub/net/p2pnat/) 

# Demos and samples
[GStreamer WebRTC](https://github.com/centricular/gstwebrtc-demos)  
[Awesome WebRTC](https://github.com/openrtc-io/awesome-webrtc)

# Build

## Prepare gstreamer docker image
```bash
cd robot/
docker build -f Dockerfile.gstreamer-1.16-buster -t maxmcd/gstreamer:1.16-buster .
```

## Run (option 1). With docker-compose
```bash
docker-compose up
```

## Run (option 2). Without docker-compose
```bash
docker run -p 5000:5000 robolive_signalling
docker run -e "SERVER=ws://$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+'):5000" robolive_robot
docker run -p 8080:80 robolive_static
```
