resource "vultr_dns_domain" "my_domain" {
  domain = "plhh.org"
  ip     = vultr_instance.instance.main_ip
}

resource "vultr_dns_record" "chat_record" {
  domain = vultr_dns_domain.my_domain.id
  name   = "chat"
  data   = vultr_instance.instance.main_ip
  ttl    = 600
  type   = "A"
}
