terraform {
  required_providers {
    vultr = {
      source  = "vultr/vultr"
      version = "2.12.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# Configure the Vultr Provider
provider "vultr" {
  api_key     = var.VULTR_API_KEY
  rate_limit  = 100
  retry_limit = 3
}
