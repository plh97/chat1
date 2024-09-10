variable "vultr_api_key" {
  type      = string
  default   = "${env("TF_VAR_VULTR_API_KEY")}"
  sensitive = true
}

packer {
  required_plugins {
    vultr = {
      version = ">=v2.3.2"
      source  = "github.com/vultr/vultr"
    }
  }
}

source "vultr" "ubuntu22" {
  api_key              = "${var.vultr_api_key}"
  os_id                = "1946"
  plan_id              = "vc2-1c-1gb"
  region_id            = "sgp"
  snapshot_description = "ubuntu 22 ${formatdate("YYYY-MM-DD hh:mm", timestamp())}"
  ssh_username         = "root"
  state_timeout        = "10m"
}

build {
  sources = ["source.vultr.ubuntu22"]
  provisioner "shell" {
    script = "ubuntu22.sh"
  }
}
