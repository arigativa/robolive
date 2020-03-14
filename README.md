# Useful materials

[Introductionary WebRTC article](https://habr.com/ru/company/yandex/blog/419951/)    
[Hole punching explained](https://bford.info/pub/net/p2pnat/) 
[GStreamer parts](https://habr.com/en/post/178813/)
[GStreamer sources](https://habr.com/ru/post/179167/)
[GStreamer sinks](https://habr.com/en/post/204014/)

# Demos and samples
[GStreamer WebRTC](https://github.com/centricular/gstwebrtc-demos)  
[Awesome WebRTC](https://github.com/openrtc-io/awesome-webrtc)

# Running with docker-compose
```bash
docker-compose up
```

# Running without docker-compose
```bash
docker run -p 5000:5000 robolive_signalling
docker run -e "SERVER=ws://$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+'):5000" robolive_robot
docker run -p 8080:80 robolive_static
```
