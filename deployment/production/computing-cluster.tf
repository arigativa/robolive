

resource "aws_key_pair" "hasselbach_public_key" {
  key_name   = "admin"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCsks/tUt46CXcdAfMbY8J0XbgHIU/JUJb6j1h/XhNuRxavoWvE/EmRMyTtgRg18GqMSkAw1GkBSPEwXjTB5DLdUmbVdu593d1OZd6XaM9WW79HuB4ak06jRbw3E1zpbDjA3u3RbSuaocsaZLeqDrNfoHyDPeRIi27m+/TsgzitIXShl8hwbgG0JixwjYtVppDElZmwu3bFJH1EpFvXir8Fr07NWi48NcR9VNOU0KZJSjeZowTNaKqwklNorxW7y3736/BhIfPVXJo5eCkP8jh0hSMW3iHmBQlhw91wlDQEm4bUE1fGHhRNiyhuJOy+HfXcdiKz+p38TCBxu/hT5u4GErZnzLvZovvvcLYY1nzMpBCS2WTASZMABI6BLUC5kXqAAtqh66BOnoMLd7FL+DcfwXfl7ozsGLI2oQG7JPmRQd2n6vTwLcICJdgJ6NBsPyJxt2gEzf+L6w3tulleWuI8FJ4jTqKxcq/e5yeer1NfHXhyrcvqnobYjEicyYAFXuY4ncSqKB+jo1z30KAhkvQU/GoRxf0DccHn2zxyUhpjGA9fr7DxQisLMZSYuHOoZuggwryZy1GeVJtttsQN1WRuzukRb5sro5NajUqrekrydH3Rsx/gzDQXNp32MBxHoIhVdM8g2YtZ49kcTXnRZQ8AMAqCU6llsiSY4rmCWvi43w== gh@arigativa.ru"
}


module "default-computing-cluster" {
  source = "../modules/computing-cluster"
  ssh_keypair_name = aws_key_pair.hasselbach_public_key.key_name
}

output "the-only-one-node-ip" {
  value = module.default-computing-cluster.instance_ip
}
