# route 53 variables
variable "domain_name" {
  default     = "plhh.xyz"
  # default     = "plhh.link"
  # default     = "plh.ninja"
  description = "domain name"
  type        = string
}

variable "record_name" {
  default     = "www"
  description = "sub domain name"
  type        = string
}
