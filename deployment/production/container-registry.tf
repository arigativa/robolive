
resource "aws_ecr_repository" "default" {
  name = "default"
}

output "container_registry_url" {
  value = aws_ecr_repository.default.repository_url
}
