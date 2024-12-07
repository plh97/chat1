FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl

COPY . /usr/src/app
WORKDIR /usr/src/app

RUN pnpm -F db dev