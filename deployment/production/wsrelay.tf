locals {
  wsrelay_image = "702803109737.dkr.ecr.eu-central-1.amazonaws.com/ws-relay:1.0"
}


resource "aws_ecs_task_definition" "wsrelay" {
  family = "wsrelay"
  container_definitions = jsonencode([{
    name = "wsrelay"
    image = local.wsrelay_image
    cpu = 1
    memory = 256
    portMappings = [
      {
        containerPort = 80
        hostPort = 80
      }
    ]
    environment = [
      { name = "PORT", value = "80" },
    ]
  }])
  network_mode = "host"
}

resource "aws_ecs_service" "streaming" {
  name = "wsrelay"
  cluster         = module.default-computing-cluster.cluster_id
  task_definition = "${aws_ecs_task_definition.wsrelay.id}:${aws_ecs_task_definition.wsrelay.revision}"
  desired_count = 1
  scheduling_strategy = "DAEMON"
}
