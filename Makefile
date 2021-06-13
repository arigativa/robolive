JETSON_HOSTNAME=jetsonnano1.hsslb.ch
JETSON_PACKAGE_FOLDER=/home/alex


build-agent:
	sbt 'project agent' universal:packageBin

deploy-agent-build:
	scp agent/target/universal/agent.zip $(JETSON_HOSTNAME):$(JETSON_PACKAGE_FOLDER)
	ssh $(JETSON_HOSTNAME) ./.bin/update-agent

