# resource "aws_route53_zone" "main" {
#   name = var.domain_name
# }

# resource "aws_eip" "lb" {
#   instance = aws_instance.app_server.id
#   domain   = "vpc"
# }

# resource "aws_route53_record" "chat" {
#   zone_id = aws_route53_zone.main.zone_id
#   name    = var.domain_name
#   records = [aws_instance.app_server.public_ip]
#   ttl  = 600
#   type = "A"
# }

# resource "aws_route53_record" "ns" {
#   allow_overwrite = true
#   name            = var.domain_name
#   ttl             = 172800
#   type            = "NS"
#   zone_id         = aws_route53_zone.main.zone_id

#   records = aws_route53_zone.main.name_servers
# }


# resource "aws_route53domains_registered_domain" "example" {
#   domain_name = var.domain_name

#   name_server {
#     name = aws_route53_zone.main.name_servers[0]
#   }

#   name_server {
#     name = aws_route53_zone.main.name_servers[1]
#   }

#   name_server {
#     name = aws_route53_zone.main.name_servers[2]
#   }

#   name_server {
#     name = aws_route53_zone.main.name_servers[3]
#   }

#   tags = {
#     Environment = "test"
#   }
# }

# output "name_servers" {
#   value = aws_route53_zone.main.name_servers
# }
