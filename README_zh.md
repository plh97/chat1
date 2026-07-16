# [Chatroom](http://c.plhh.org/) &middot; [![Github Action Status](https://github.com/plh97/chat1/actions/workflows/github-CICD-actions.yml/badge.svg)](https://github.com/plh97/chat1/actions) [![Github Action Status](https://github.com/plh97/chat1/actions/workflows/main.yml/badge.svg)](https://github.com/plh97/chat1/actions) [![Netlify Status](https://api.netlify.com/api/v1/badges/591b7e3b-bff0-4b20-899c-396d25bd75dd/deploy-status)](https://app.netlify.com/sites/plh-chat-private/deploys)

[English](README.md) | [简体中文](README_zh.md)

## 架构

- 开发环境
  - 数据库
    - mongodb
  - ansible
  - terraform
  - nginx 网关
  - 包管理
    - frontend（前端）
      - vite[unplugin-auto-import/vite]
      - eslint+prettier
      - react+hook+ts+redux
      - @chakra-ui/react
      - tailwind
      - socket-io/client
      - Netlify
    - backend-go（后端）
      - Go
      - websocket
      - gin/fiber
      - wire（依赖注入）
      - gorm（ORM）
      - JWT 认证
      - swagger 文档

## 工作原理

### 系统概述

这是一个基于微服务架构的实时聊天应用，部署在云基础设施上。系统采用现代 DevOps 实践进行自动化配置和部署。

### 基础设施栈

**1. Terraform（基础设施即代码）**

- 在 Vultr/AWS 上配置云基础设施
- 创建预定义配置的 EC2 实例
- 管理 DNS、SSH 密钥和防火墙规则
- 配置文件位于 `terraform/vultr/` 和 `terraform/aws/`

**2. Ansible（配置管理与部署）**

- 自动化服务器环境设置
- 管理 Docker 容器生命周期
- 处理 CI/CD 流水线执行
- 克隆仓库、安装依赖并部署应用
- 配置文件位于 `ansible/` 目录

**3. Nginx（反向代理与网关）**

- 作为所有 HTTP/HTTPS 流量的入口点
- 提供静态前端文件服务
- 将 `/api` 请求路由到 backend-go 服务器
- 处理 `/ws` 端点的 WebSocket 升级
- SSL/TLS 终止和证书管理
- Gzip 压缩和请求缓冲
- 配置文件位于 `nginx/conf.d/`

### 后端架构

**4. Go 后端服务器（`packages/backend-go/`）**

后端使用 Go 构建，遵循清晰架构原则：

- **HTTP 服务器**：监听 8000 端口处理 REST API 请求
- **WebSocket 服务器**：使用 Pitaya 框架监听 8000 端口进行实时通信
- **依赖注入**：使用 Wire 进行编译时依赖注入
- **身份验证**：基于 JWT 的中间件认证
- **项目结构**：
  - `internal/handler/`：HTTP 和 WebSocket 请求处理器
  - `internal/service/`：业务逻辑层
  - `internal/repository/`：数据访问层
  - `internal/model/`：数据库模型
  - `pkg/`：可重用包（日志、配置、服务器）

**5. MySQL 数据库**

应用使用 MySQL（而非架构图中的 MongoDB）包含以下数据表：

- **users**：用户资料和认证凭据

  - 字段：id, username, email, password, bio, qq, wechat, github, permission, image

- **rooms**：聊天室（私聊或群聊）

  - 字段：id, name, image, channel_type, read_seq
  - 类型：PRIVATE（一对一）、PUBLIC（群聊）

- **messages**：所有聊天消息

  - 字段：id, seq, content_type, channel_id, text_message, media_message, read_message, recall_message, system_message, user_id, room_id, reply_id
  - 支持多种消息类型：文本、媒体、已读回执、撤回、系统通知

- **room_members**：用户与房间的多对多关系

  - 字段：user_id, room_id, role（creator/admin/member）
  - 管理房间权限和成员资格

- **user_friends**：好友关系的多对多关系
  - 支持好友管理和私信功能

**6. WebSocket 通信**

- 使用 Pitaya 框架作为 WebSocket 服务器
- 处理实时消息广播
- 基于群组的消息路由（房间/频道）
- 心跳机制（15 秒间隔）
- 会话管理和用户认证
- 路由：`room.create`、`room.join`、`room.sendMessage` 等
- 自动向房间内所有成员广播消息

### 数据流

1. **用户请求** → Nginx（端口 80/443）
2. **静态文件** → 直接由 Nginx 提供服务
3. **API 请求** → Nginx 代理到 Backend-Go HTTP 服务器（端口 8000）
4. **WebSocket** → Nginx 升级连接并代理到 WS 服务器（端口 8000）
5. **后端** → 处理请求，通过 GORM 查询 MySQL 数据库
6. **实时更新** → WebSocket 服务器向同一房间的已连接客户端广播
7. **响应** → 通过 Nginx 返回 JSON 数据给客户端

### 部署流水线

1. **配置基础设施**：Terraform 创建云基础设施
2. **环境配置**：Ansible 设置服务器环境
3. **部署**：Ansible 拉取代码、安装依赖、构建并运行 Docker 容器
4. **监控**：应用日志存储在 `storage/logs/`

### 配置

- **本地开发**：`packages/backend-go/config/local.yml`
- **生产环境**：`packages/backend-go/config/prod.yml`
- 环境特定的数据库、Redis、JWT、日志配置

## 开发

```bash
pnpm
npm install
pnpm run dev
```

## 部署

- Terraform 创建 Vultr EC2 服务
- Ansible 创建虚拟机环境
- Ansible 克隆项目
- 安装依赖
- 构建项目
- 在 Docker 中部署项目

## CI/CD

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

- [x] 发送系统消息
  - [x] 发送添加新成员系统消息
  - [x] 发送创建新好友系统消息
  - [x] 向所有频道成员广播 WebSocket 消息
  - [x] 添加成员应该去重
  - [ ] 添加成员/管理员时也应该更新对方用户的房间信息
- [x] 撤回消息
- [ ] 修改房间名称
- [ ] 修改房间头像
- [ ] 移除房间管理员/成员
- [ ] 转让房间所有者
- [ ] 虚拟滚动
- [ ] 使 simple-git-hooks 生效
