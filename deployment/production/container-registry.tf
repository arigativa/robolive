//one repo per application =/

resource "aws_ecr_repository" "default" {
  name = "default"
}

resource "aws_ecr_repository" "ws-relay" {
  name = "ws-relay"
  image_tag_mutability = "IMMUTABLE"
}

output "container-registries" {
  value = {
    // default??
    "default" = aws_ecr_repository.default.repository_url
    "ws-relay" = aws_ecr_repository.ws-relay.repository_url
  }
}