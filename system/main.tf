provider "aws" {
  region = "eu-central-1"
  access_key = "AKIA2HISUM5U7HWXCIHO"
  secret_key = "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"
}

resource "aws_s3_bucket" "hud" {
  bucket = "live-hud"
  acl = "public-read"
  website {
    index_document = "index.html"
  }
}

locals {
  hud_dir = "../hud/static"
}

resource "aws_s3_bucket_object" "hud-assets" {
  for_each = fileset(local.hud_dir, "**")
  bucket = aws_s3_bucket.hud.bucket
  acl = "public-read"
  key = each.value
  source = "${local.hud_dir}/${each.value}"
  etag = filemd5("${local.hud_dir}/${each.value}")
  content_type = length(regexall("\\.html$", each.value)) > 0 ? "text/html" : null
}

output "hud_endpoint" {
  value = aws_s3_bucket.hud.website_endpoint
}

resource "aws_ecr_repository" "default" {
  name = "default"
}

output "container_registry_url" {
  value = aws_ecr_repository.default.repository_url
}

locals {
  streamer_image_tag = "v3"
  streamer_image = "${aws_ecr_repository.default.repository_url}:${local.streamer_image_tag}"
    
  hud_endpoint = "http://${aws_s3_bucket.hud.website_endpoint}"
  hud_pipeline = "alpha method=green"
}

resource "aws_ecs_cluster" "default" {
  name = "default"
}

resource "aws_ecs_task_definition" "streamer" {
  family = "streamer"
  container_definitions = jsonencode([{
    name = "streamer"
    image = local.streamer_image
    cpu = 1
    memory = 256
    environment = [
      { name = "RTMP_TARGET", value = var.rtmp_endpoint },
      { name = "HUD_URL", value = local.hud_endpoint },
      { name = "HUD_PIPELINE", value = local.hud_pipeline },
    ]
  }])
  network_mode = "host"
}

resource "aws_ecs_service" "streaming" {
  name = "streaming"
  cluster         = aws_ecs_cluster.default.id
  task_definition = "${aws_ecs_task_definition.streamer.id}:${aws_ecs_task_definition.streamer.revision}"
  desired_count = 1
  scheduling_strategy = "DAEMON"
}

data "aws_ami" "amazon_linux_ecs" {
  most_recent = true

  owners = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn-ami-*-amazon-ecs-optimized"]
  }

  filter {
    name   = "owner-alias"
    values = ["amazon"]
  }
}

resource "aws_key_pair" "hasselbach_public_key" {
  key_name   = "admin"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCsks/tUt46CXcdAfMbY8J0XbgHIU/JUJb6j1h/XhNuRxavoWvE/EmRMyTtgRg18GqMSkAw1GkBSPEwXjTB5DLdUmbVdu593d1OZd6XaM9WW79HuB4ak06jRbw3E1zpbDjA3u3RbSuaocsaZLeqDrNfoHyDPeRIi27m+/TsgzitIXShl8hwbgG0JixwjYtVppDElZmwu3bFJH1EpFvXir8Fr07NWi48NcR9VNOU0KZJSjeZowTNaKqwklNorxW7y3736/BhIfPVXJo5eCkP8jh0hSMW3iHmBQlhw91wlDQEm4bUE1fGHhRNiyhuJOy+HfXcdiKz+p38TCBxu/hT5u4GErZnzLvZovvvcLYY1nzMpBCS2WTASZMABI6BLUC5kXqAAtqh66BOnoMLd7FL+DcfwXfl7ozsGLI2oQG7JPmRQd2n6vTwLcICJdgJ6NBsPyJxt2gEzf+L6w3tulleWuI8FJ4jTqKxcq/e5yeer1NfHXhyrcvqnobYjEicyYAFXuY4ncSqKB+jo1z30KAhkvQU/GoRxf0DccHn2zxyUhpjGA9fr7DxQisLMZSYuHOoZuggwryZy1GeVJtttsQN1WRuzukRb5sro5NajUqrekrydH3Rsx/gzDQXNp32MBxHoIhVdM8g2YtZ49kcTXnRZQ8AMAqCU6llsiSY4rmCWvi43w== gh@arigativa.ru"
}

resource "aws_iam_role" "ecs-instance-role" {
  name = "ecsInstanceRole"
  description = "Allows EC2 instances in an ECS cluster to access ECS."
  assume_role_policy = <<EOF
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "ecs-instance-role-ecs" {
  role = aws_iam_role.ecs-instance-role.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs-instance-profile" {
  name = "ecsInstanceProfile"
  role = aws_iam_role.ecs-instance-role.name
}

resource "aws_instance" "streaming_instance" {
  ami = data.aws_ami.amazon_linux_ecs.id
  instance_type = "c4.large"
  user_data = <<EOF
#!/bin/bash
echo "ECS_CLUSTER=${aws_ecs_cluster.default.name}"  >> /etc/ecs/ecs.config
EOF
  key_name = aws_key_pair.hasselbach_public_key.key_name
  iam_instance_profile = aws_iam_instance_profile.ecs-instance-profile.id
}

output "streamer_instance_ip" {
  value = aws_instance.streaming_instance.public_ip
}
