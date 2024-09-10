variable "key_name" {
  default = "qwe"
}

resource "tls_private_key" "example" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "vultr_ssh_key" "my_ssh_key" {
  name    = var.key_name
  ssh_key = tls_private_key.example.public_key_openssh
}

resource "local_sensitive_file" "pem_file" {
  filename             = pathexpand("~/.ssh/${var.key_name}.pem")
  file_permission      = "600"
  directory_permission = "700"
  content    = tls_private_key.example.private_key_pem
}
