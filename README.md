# [Chatroom](http://c.plhh.org/) &middot; [![Github Action Status](https://github.com/plh97/chat1/actions/workflows/github-CICD-actions.yml/badge.svg)](https://github.com/plh97/chat1/actions) [![Github Action Status](https://github.com/plh97/chat1/actions/workflows/main.yml/badge.svg)](https://github.com/plh97/chat1/actions) [![Netlify Status](https://api.netlify.com/api/v1/badges/591b7e3b-bff0-4b20-899c-396d25bd75dd/deploy-status)](https://app.netlify.com/sites/plh-chat-private/deploys) ![Vercel](https://vercelbadge.vercel.app/api/plh97/chat1)

[English](README.md) | [简体中文](README_zh.md)

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
    - backend-go
      - Go
      - websocket
      - gin/fiber
      - wire (dependency injection)
      - gorm (ORM)
      - JWT authentication
      - swagger docs

## How It Works

### System Overview

This is a real-time chat application with a microservices architecture deployed on cloud infrastructure. The system uses modern DevOps practices for automated provisioning and deployment.

### Infrastructure Stack

**1. Terraform (Infrastructure as Code)**

- Provisions cloud infrastructure on Vultr/AWS
- Creates EC2 instances with predefined configurations
- Manages DNS, SSH keys, and firewall rules
- Located in `terraform/vultr/` and `terraform/aws/`

**2. Ansible (Configuration Management & Deployment)**

- Automates server environment setup
- Manages Docker container lifecycle
- Handles CI/CD pipeline execution
- Clones repository, installs dependencies, and deploys application
- Configuration files in `ansible/` directory

**3. Nginx (Reverse Proxy & Gateway)**

- Acts as the entry point for all HTTP/HTTPS traffic
- Serves static frontend files
- Routes `/api` requests to backend-go server
- Handles WebSocket upgrades for `/ws` endpoint
- SSL/TLS termination with certificate management
- Gzip compression and request buffering
- Configuration in `nginx/conf.d/`

### Backend Architecture

**4. Go Backend Server (`packages/backend-go/`)**

The backend is built with Go and follows clean architecture principles:

- **HTTP Server**: Listens on port 8000 for REST API requests
- **WebSocket Server**: Listens on port 8000 using Pitaya framework for real-time communication
- **Dependency Injection**: Uses Wire for compile-time dependency injection
- **Authentication**: JWT-based authentication with middleware
- **Structure**:
  - `internal/handler/`: HTTP and WebSocket request handlers
  - `internal/service/`: Business logic layer
  - `internal/repository/`: Data access layer
  - `internal/model/`: Database models
  - `pkg/`: Reusable packages (logger, config, servers)

**5. MySQL Database**

The application uses MySQL (not MongoDB as shown in architecture) with the following tables:

- **users**: User profiles with authentication credentials

  - Fields: id, username, email, password, bio, qq, wechat, github, permission, image

- **rooms**: Chat rooms (private or public/group)

  - Fields: id, name, image, channel_type, read_seq
  - Types: PRIVATE (1-on-1), PUBLIC (group chat)

- **messages**: All chat messages

  - Fields: id, seq, content_type, channel_id, text_message, media_message, read_message, recall_message, system_message, user_id, room_id, reply_id
  - Supports multiple message types: text, media, read receipts, recalls, system notifications

- **room_members**: Many-to-many relationship between users and rooms

  - Fields: user_id, room_id, role (creator/admin/member)
  - Manages room permissions and membership

- **user_friends**: Many-to-many relationship for friend connections
  - Enables friend management and private messaging

**6. WebSocket Communication**

- Uses Pitaya framework for WebSocket server
- Handles real-time message broadcasting
- Group-based message routing (rooms/channels)
- Heartbeat mechanism (15-second intervals)
- Session management with user authentication
- Routes: `room.create`, `room.join`, `room.sendMessage`, etc.
- Automatically broadcasts messages to all room members

### Data Flow

1. **User Request** → Nginx (Port 80/443)
2. **Static Files** → Served directly by Nginx
3. **API Requests** → Nginx proxies to Backend-Go HTTP Server (Port 8000)
4. **WebSocket** → Nginx upgrades connection and proxies to WS Server (Port 8000)
5. **Backend** → Processes requests, queries MySQL database via GORM
6. **Real-time Updates** → WebSocket server broadcasts to connected clients in the same room
7. **Response** → JSON data returned through Nginx to client

### Deployment Pipeline

1. **Provision**: Terraform creates cloud infrastructure
2. **Configure**: Ansible sets up server environment
3. **Deploy**: Ansible pulls code, installs dependencies, builds and runs Docker containers
4. **Monitor**: Application logs stored in `storage/logs/`

### Configuration

- **Local Development**: `packages/backend-go/config/local.yml`
- **Production**: `packages/backend-go/config/prod.yml`
- Environment-specific settings for database, Redis, JWT, logging

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

## 后端接口列表（packages/backend-go）

| 路径              | 方法   | 说明         |
| ----------------- | ------ | ------------ |
| /api/upload       | POST   | 上传图片     |
| /api/login        | POST   | 用户登录     |
| /api/logout       | POST   | 用户登出     |
| /api/register     | POST   | 用户注册     |
| /api/userInfo     | GET    | 获取用户信息 |
| /api/userInfo     | POST   | 设置用户信息 |
| /api/user         | GET    | 查询用户     |
| /api/friend       | POST   | 添加好友     |
| /api/friend       | DELETE | 删除好友     |
| /api/userImage    | GET    | 获取用户头像 |
| /api/room         | POST   | 创建房间     |
| /api/room         | GET    | 获取房间信息 |
| /api/room         | PATCH  | 更新房间信息 |
| /api/room         | DELETE | 删除房间     |
| /api/joinRoom     | POST   | 加入房间     |
| /api/room/message | DELETE | 删除房间消息 |

> 以上接口均在 `packages/backend-go/internal/handler/` 目录下实现。

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
