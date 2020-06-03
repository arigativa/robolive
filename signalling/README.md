# Run in the docker

Build:
```shell script
docker build -t robolive-kamailio .
```

And run: 
```shell script
docker-compose up
```

run client and connect it to *127.0.0.1:4443* via websocket or tcp


# Installation on local machine:

## kamailio

### Manual build

Install deps
> apt-get install git bison gcc g++ flex default-libmysqlclient-dev make autoconf libssl-dev libcurl4-openssl-dev libxml2-dev libpcre3-dev libunistring-dev 

install lua deps
> apt-get install lua5.1 liblua5.1-dev luarocks 

install lua packets
> luarocks install lua-cjson

clone kamailio 5.3
> git clone -b 5.3 https://github.com/kamailio/kamailio

go to dir cloned
> cd kamailio

create initial config:
> make cfg

open *src/modules.lst* and add to *include_modules*: 
> websocket app_lua xhttp db_mysql tls

add to *skip_modules*:
> app_sqlang

build and install
> make all
> make install

open *setup.cfg*
uncomment commented **#!define TEST**
uncomment commented **#!define LUA_SCRIPT_PATH ...** and fill **<your_repo_dir_absolute_pass>** with absolute pass to signalling

run it:
> kamailio -f *<absolute_path_to>/kamailio.cfg*

stop it:
> pkill kamailio

**P.S.** you may need **sudo** privelege for run
## coturn

apt-get install coturn

## TODO:
 - cover .lua with tests
 - add coturn configuration here
 - wrappup all into ansible
 - add tls

