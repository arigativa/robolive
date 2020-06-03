FROM debian:10 as builder

RUN apt-get update && apt-get install -y git bison gcc g++ flex default-libmysqlclient-dev make autoconf libssl-dev libcurl4-openssl-dev libxml2-dev libpcre3-dev libunistring-dev
RUN apt-get install -y lua5.1 liblua5.1-dev luarocks
RUN luarocks install lua-cjson 

WORKDIR /usr/src
RUN git clone -b 5.3 https://github.com/kamailio/kamailio

WORKDIR /usr/src/kamailio/src

RUN make include_modules="websocket app_lua tls" skip_modules="app_sqlang" cfg
RUN make all && make install

WORKDIR /etc/kamailio

CMD ["kamailio","-DD","-E","-f","kamailio.cfg"]