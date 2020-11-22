##############################
# Stage 0: Kamalio build image

FROM debian:10 as builder

RUN sed -i "s#deb http://security.debian.org/debian-security stretch/updates main#deb http://deb.debian.org/debian-security stretch/updates main#g" /etc/apt/sources.list
RUN apt update
RUN echo "Installing build tools" && apt install -y git bison gcc g++ flex make autoconf
RUN echo "Installing kamailio build dependencies [1/2]" && apt install -y libssl-dev libcurl4-openssl-dev libxml2-dev
RUN echo "Installing kamailio build dependencies [2/2]" && apt install -y  libpcre3-dev libunistring-dev liblua5.1-dev

RUN echo "Cloning kamailio" && git clone --depth 1 -b 5.4 https://github.com/kamailio/kamailio /kamailio-build

WORKDIR /kamailio-build/src

RUN make include_modules="websocket app_lua tls" skip_modules="app_sqlang" cfg
RUN make all
RUN mkdir /kamailio-distr
RUN make prefix=/kamailio-distr install

# Package archive
RUN tar -czf /kamailio-distr.tar.gz -C /kamailio-distr/ .

################################
# Stage 1: Kamalio runtime image

FROM debian:10

RUN sed -i "s#deb http://security.debian.org/debian-security stretch/updates main#deb http://deb.debian.org/debian-security stretch/updates main#g" /etc/apt/sources.list
RUN apt update
RUN echo "Installing kamailio runtime dependencies [1/2]" && apt install -y libssl1.1 openssl libcurl4 libxml2
RUN echo "Installing kamailio runtime dependencies [2/2]" && apt install -y libpcre16-3 libpcre32-3 libpcrecpp0v5 lua5.1 luarocks
RUN luarocks install lua-cjson
RUN luarocks install base64
RUN luarocks install net-url

RUN mkdir /opt/kamailio
WORKDIR /opt/kamailio
COPY --from=builder /kamailio-distr/ ./

ENV LD_LIBRARY_PATH /opt/kamailio/lib64/kamailio
ENV PATH /opt/kamailio/sbin/:$PATH

WORKDIR /etc/kamailio

CMD ["kamailio", "-DD", "-E", "-f", "kamailio.cfg", "-L", "/opt/kamailio/lib64/kamailio/modules"]
