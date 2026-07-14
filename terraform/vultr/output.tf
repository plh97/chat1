output "instance_ip_addr" {
  # sensitive = true
  value     = vultr_instance.instance.main_ip
}

output "ansible_inventory_file" {
  value = local_file.ansible_vultr_inventory.filename
}

output "ansible_ping_command" {
  value = "cd ../../ansible && ansible -i hosts.vultr vultr -m ping"
}
