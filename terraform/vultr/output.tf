output "instance_ip_addr" {
  # sensitive = true
  value     = vultr_instance.instance.main_ip
}
