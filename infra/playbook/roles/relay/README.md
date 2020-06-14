# TODO:
- add description of the the trick to allow selfsigned sertificate to be able to run turns

## To install it locally:
> run docker build -t coturn -f Dockerfile .

Install ansible on your machine 
> `apt-get install ansible || brew install ansible ` (or use packet manage for your system)

## generate config for local machine
create `tmp/config/` directory at the parent directory for `infrastructure`
go to the `infrastructure` directory and run
> ansible-playbook -c local -i inventory/local playbook.yml

Add to docker-compose.yml
```yml
    turn: 
        container_name: coturn
        image: coturn
        restart: always
        ports:
            - 8080:8080
            - 4443:4443
            - 46000-46100:46000-46100
        volumes:
            - "./tmp/config:/etc/coturn"
        networks:
            testing_net:
                ipv4_address: 172.28.1.4
```