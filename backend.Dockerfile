FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl

COPY . /usr/src/app
WORKDIR /usr/src/app

# RUN pnpm bootstrap
# RUN npm install -w --save-dev tsconfig-paths
# RUN pnpm i --save-dev tsconfig-paths
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm -F db dev
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm  -F backend install tsconfig-paths
CMD [ "pnpm", "serve" ]