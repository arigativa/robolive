# Useful materials

[Introductionary WebRTC article](https://habr.com/ru/company/yandex/blog/419951/)    
[Hole punching explained](https://bford.info/pub/net/p2pnat/)   
[GStreamer parts](https://habr.com/en/post/178813/)  
[GStreamer sources](https://habr.com/ru/post/179167/)  
[GStreamer sinks](https://habr.com/en/post/204014/)  
[WebRTC Basics](https://www.html5rocks.com/en/tutorials/webrtc/basics/)    
[WebRTC Signalling](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/)  
[Sample frontend applciaiton](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)  

# Demos and samples
[GStreamer WebRTC](https://github.com/centricular/gstwebrtc-demos)  
[Awesome WebRTC](https://github.com/openrtc-io/awesome-webrtc)

# Configure Docker registry

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

# Build

## Run (option 1). With docker-compose
`--build` will make sure that all images are built from current Dockerfile's
```bash
docker-compose up --build
```

## Run (option 2). Without docker-compose
```bash
docker run -p 5000:5000 robolive_signalling
docker run -e "SERVER=ws://$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+'):5000" robolive_robot
docker run -p 8080:80 robolive_static
```

# Deploy

## Deploy production
```
cd deployment/production
terraform init
terraform apply
```
