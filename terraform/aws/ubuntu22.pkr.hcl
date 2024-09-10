variable "aws_api_key" {
  type      = string
  default   = "${env("TF_VAR_AWS_API_KEY")}"
  sensitive = true
}

source "amazon-ebs" "basic-example" {
  access_key = "${env("AWS_SECRET_ACCESS_KEY")}"
  secret_key = "${env("AWS_ACCESS_KEY_ID")}"
  region     = "ap-southeast-1"
}


packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.6"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "ubuntu" {
  ami_name      = "packer-linux-aws"
  instance_type = "t2.micro"
  region        = "ap-southeast-1"
  source_ami           = "ami-09dac21d1664bc313"
  ssh_username = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.ubuntu"]
  provisioner "shell" {
    script = "ubuntu22.sh"
  }
}
