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

resource "local_file" "ansible_vultr_inventory" {
  filename        = "${path.module}/../../ansible/hosts.vultr"
  file_permission = "0644"
  content = <<-EOT
vultr ansible_host=${vultr_instance.instance.main_ip} ansible_user=root ansible_ssh_private_key_file=${local_sensitive_file.pem_file.filename}
EOT
}
