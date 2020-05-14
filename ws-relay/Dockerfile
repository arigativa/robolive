FROM openjdk:9

ADD target/universal/ws-relay-1.0.tgz /ws-relay

RUN sh -c '[ -d /ws-relay/ ] || ( echo "Package was not extracted by Docker properly" && exit 1 )'

CMD /ws-relay/ws-relay-1.0/bin/ws-relay
