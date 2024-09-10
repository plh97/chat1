resource "vultr_instance" "instance" {
  plan              = "vc2-1c-1gb"
  region            = "sgp"
  snapshot_id       = "6d664ee7-8182-4127-85a6-3e802538f281"
  firewall_group_id = "dd776525-5e19-42e1-b55a-ad6da1cf6a4b"
  hostname          = "vultr.guest"
  label             = "chat room instance"
  ssh_key_ids       = [var.ssh_key_id, vultr_ssh_key.my_ssh_key.id]
}
