FROM hashicorp/terraform:latest

COPY aws /aws

WORKDIR /aws

RUN command
