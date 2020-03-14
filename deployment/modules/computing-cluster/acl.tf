
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
