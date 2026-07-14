resource "vultr_instance" "instance" {
  plan              = var.plan
  region            = var.region
  hostname          = var.hostname
  label             = var.label
  os_id             = var.snapshot_id == null ? var.os_id : null
  snapshot_id       = var.snapshot_id
  firewall_group_id = var.firewall_group_id
  ssh_key_ids = concat(
    var.ssh_key_id == null || var.ssh_key_id == "" ? [] : [var.ssh_key_id],
    [vultr_ssh_key.my_ssh_key.id],
  )
}

resource "null_resource" "sync_github_deploy_host" {
  triggers = {
    main_ip = vultr_instance.instance.main_ip
  }

  provisioner "local-exec" {
    command = "sh modify_ip.sh ${self.triggers.main_ip}; ssh-keyscan -H ${self.triggers.main_ip} >> ~/.ssh/known_hosts || true"
  }
}
