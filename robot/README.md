How to run:
1 Start signalling  
2 Start client  
3 `docker build -t robot-base .` from root folder
4 `docker:publishLocal`
5 `docker run --user root -e "SIGNALLING_URI=ws://$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+'):5000" --device=/dev/video0:/dev/video0 robot-sca:0.1`
