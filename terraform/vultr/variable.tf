variable "VULTR_API_KEY" {
  type = string
}

variable "region" {
  type    = string
  default = "nrt"
}

variable "plan" {
  type    = string
  default = "vc2-1c-1gb"
}

variable "hostname" {
  type    = string
  default = "vultr.guest"
}

variable "label" {
  type    = string
  default = "chat-room-instance"
}

variable "os_id" {
  type    = number
  default = 1743
}

variable "snapshot_id" {
  type    = string
  default = null
}

variable "firewall_group_id" {
  type    = string
  default = null
}

variable "ssh_key_id" {
  type    = string
  default = null
}
