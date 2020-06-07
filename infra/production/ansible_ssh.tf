resource "tls_private_key" "ansible" {
  algorithm = "RSA"
}

variable "ansible_user" {
  default = "ansible"
}
