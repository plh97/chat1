# [Chatroom](http://plhh.org/) &middot; [![Github Action Status](https://github.com/plh2/chatroom/actions/workflows/github-CICD-actions.yml/badge.svg)](https://github.com/plh2/chatroom/actions) [![Github Action Status](https://github.com/plh2/chatroom/actions/workflows/main.yml/badge.svg)](https://github.com/plh2/chatroom/actions) [![Netlify Status](https://api.netlify.com/api/v1/badges/591b7e3b-bff0-4b20-899c-396d25bd75dd/deploy-status)](https://app.netlify.com/sites/plh-chat-private/deploys)

## Architecture

- Development
  - datebase
    - mongodb
  - ansible
  - terraform
  - nignx gateway
  - package
    - frontend
      - vite[unplugin-auto-import/vite]
      - eslint+prettier
      - react+hook+ts+redux
      - @chakra-ui/react
      - tailwind
      - socket-io/client
      - Netlify
    - backend
      - node+ts
      - websocket
      - Koa
      - cors
      - koa-router
      - koa-static
      - AWS

## Dev

```bash
pnpm
npm install
pnpm run dev
```

## Deploy

- terraoform create a Vultr EC2 service
- ansible create vm environment
- ansible clone project
- install dependences
- build project
- deploy project inside docker

## CICD

```bash
cd ansilbe
ansible-playbook cicd.yml
```

## TODO

- [x] send system message
  - [x] send add new member system message
  - [x] send create new friend system message
  - [x] broadcast ws to all channal member
  - [x] add member should be reduce
  - [ ] add member/admin should also update opposite user room info
- [x] recall message
- [ ] change room name
- [ ] change room avatar
- [ ] remove room admin/member
- [ ] transfer room owner
- [ ] virtual scroll
- [ ] make simple-git-hooks can work
