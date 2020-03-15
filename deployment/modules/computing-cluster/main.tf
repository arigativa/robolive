variable "ssh_keypair_name" {
  type = string
}

resource "aws_ecs_cluster" "default" {
  name = "default"
}

output "cluster_id" {
  value = aws_ecs_cluster.default.id
}

resource "aws_instance" "streaming_instance" {
  ami = data.aws_ami.amazon_linux_ecs.id
  instance_type = "c4.large"
  user_data = <<EOF
#!/bin/bash
echo "ECS_CLUSTER=${aws_ecs_cluster.default.name}"  >> /etc/ecs/ecs.config
EOF
  key_name = var.ssh_keypair_name
  iam_instance_profile = aws_iam_instance_profile.ecs-instance-profile.id
}
