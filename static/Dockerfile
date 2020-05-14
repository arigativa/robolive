FROM nginx

COPY . /usr/share/nginx/html

ARG wsUrl=wss://rl.arigativa.ru:6969

WORKDIR /usr/share/nginx/html
RUN sed -i "s#__WS_URL__#$wsUrl#g" js/webrtc.js
