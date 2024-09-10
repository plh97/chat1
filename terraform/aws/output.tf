output "instance_ip_addr" {
  # sensitive = true
  value     = aws_instance.app_server.public_ip
}
