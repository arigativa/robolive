# Project overview:
## Non technical overview:
The aim of this project is to build a system which allows multiple agents to interact   
with each other via different communication channels.
Agent - is a unit of the system, which can:
- do some actions (e.g.: move robotic arm, open doors, etc.)
- consume data (e.g.: commands to open door or move robotic arm, video\audio streams)
- produce data (e.g.: commands to open door or move robotic arm, video\audio streams)
With that in mind, examples of agents are:
- camera, which can send media (video\audio streams)
- user, who can consume such streams and give commands to camera to move
- automatic pet feeder, which could be controlled by the camera when pet comes closer
- and many more 

Communication channel is a transport protocol together with application level protocol, for example:
- sip
- grpc
- telegram messages

over:
- ethernet
- wifi
- bluetooth

As being said - not only user can control agents, but agents themselves could be controlled by each other.  
Such capabilities will be enabled by visual data flow language, which allows users to 
build their own agents interconnection network.  
For example, the goal could be to turn on an electrical fan when the temperature will reach certain point.
This task could be achieved (roughly) with following diagram:  
```
thermomether --|temperature|--> fan: turn on if temperature >= 26
``` 


One of the goals of the project is to provide DIY (do it yourself) people an ability to create their own devices,
based on popular chips. To make this possible an SDK (software development kit) will be developed, which will allow
to write only logic and the rest of discussed features, as interconnections between agents, will be `free`.  

Data flow programming and user interactions with agents will be performed through graphical user interface, either via web browser or
smartphone.   
 

## Useful materials

[Introductionary WebRTC article](https://habr.com/ru/company/yandex/blog/419951/)    
[Hole punching explained](https://bford.info/pub/net/p2pnat/)   
[GStreamer parts](https://habr.com/en/post/178813/)  
[GStreamer sources](https://habr.com/ru/post/179167/)  
[GStreamer sinks](https://habr.com/en/post/204014/)  
[WebRTC Basics](https://www.html5rocks.com/en/tutorials/webrtc/basics/)    
[WebRTC Signalling](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/)  
[Sample frontend applciaiton](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)  

## Demos and samples
[GStreamer WebRTC](https://github.com/centricular/gstwebrtc-demos)  
[Awesome WebRTC](https://github.com/openrtc-io/awesome-webrtc)

[WebPhone Demo](https://rl.arigativa.ru/webPhone/)

## Configure Docker registry

Install aws-cli (`snap install aws-cli --classic` for ubuntu)

Take credentials from `deployment/production/_setup.tf`, then:
```shell script
> aws configure
  AWS Access Key ID [****************]: xxxxxxxxx
  AWS Secret Access Key [****************]: xxxxxxxxxxxxxxxx
  Default region name [None]: eu-central-1
  Default output format [None]: 

> bash -c "$(aws ecr get-login --no-include-email)"
WARNING! Using --password via the CLI is insecure. Use --password-stdin.
Login Succeeded


```

## Build

### Run (option 1). With docker-compose
`--build` will make sure that all images are built from current Dockerfile's
```bash
docker-compose up --build
```

### Run (option 2). Without docker-compose
```bash
docker run -p 5000:5000 robolive_signalling
docker run -e "SERVER=ws://$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+'):5000" robolive_robot
docker run -p 8080:80 robolive_static
```

## Deploy

### Deploy production
```
cd deployment/production
terraform init
terraform apply
```

### Run locally
```shell script
export VIDEO_SRC='videotestsrc is-live=true pattern=ball ! videoconvert'
export SIGNALLING_SIP_URI='localhost:9031'
``` 
### Run on Jetson Nano

To run robot on Jetson Nano with CSI camera you can override video/audio source:
```shell script
export AUDIO_SRC='audiotestsrc wave=silence ! audioconvert'
export VIDEO_SRC='nvarguscamerasrc sensor_mode=3 ! video/x-raw(memory:NVMM),width=1280, height=720, framerate=60/1, format=NV12 ! nvvidconv flip-method=0 ! videoconvert'
```


### Run robot connected to Production using docker

```shell script
docker-compose run --no-deps -e REGISTRY_HOST=rl.arigativa.ru -e ROBOT_NAME='FromDevMachine' robot
```

#### sensor_mode values

| # | Resolution  | FPS | Exposure, us |  
|---|:-----------:| ---:| ------------:|
| 0 | 3264 x 2464 |  21 |     47619048 |
| 1 | 3264 x 1848 |  28 |     35714284 |
| 2 | 1920 x 1080 |  30 |     33333334 |
| 3 | 1280 x 720  |  60 |     16666667 |
| 4 | 1280 x 720  | 120 |      8333333 |

### Build protobuf for frontend
Will create ./client/generated folder with generated protobuf code.  
Do not change, all changes will be overwritten by protoc.  
If you want to change something consider change .proto files in `protocols` folder  
```shell script
DOCKER_BUILDKIT=1 docker build -t client_proto --output client/ -f Dockerfile.client_proto .
```
