# Config Hub

> [!WARNING]
> 还在搓，暂时不要使用。

> "Work in Progress" — 机场订阅聚合 + Mihomo 配置管理

一个自托管的代理配置管理中心。拉取多个机场订阅源，统一管理节点，自动生成 Mihomo (Clash Meta) 兼容的 YAML 配置文件，并通过独立 Token 分发给各个客户端。

## 功能

- **订阅聚合**: 添加多个机场订阅 URL，统一拉取和管理所有节点，支持定时自动刷新
- **智能分类**: 自动识别节点所属国家/地区（香港、日本、新加坡等 22 个地区），区分低倍率节点和落地节点
- **配置生成**: 基于预设模板（52 个代理组 + 37 条规则）自动生成 Mihomo 兼容的完整 YAML 配置
- **可视化编辑**: Web GUI 管理订阅源、查看节点统计、管理配置档案、拖拽排序代理组与规则
- **Token 分发**: 每个配置档案生成独立的分发 Token，客户端通过 `/sub` 端点获取配置，Token 支持吊销
- **单文件部署**: Go 编译时将 React 前端嵌入二进制，一个文件即可运行，也支持 Docker 部署

## 快速开始

### 前置依赖

- Go 1.26+
- Node.js 20+ / pnpm
- Mihomo 源码（本地 replace，编译时依赖）

### 构建前端

```bash
cd web
pnpm install
pnpm build          # 输出到 web/dist/
```

### 构建后端

```bash
# 在项目根目录
go build -ldflags="-s -w" -o config-hub .
```

### 运行

```bash
./config-hub
```

服务默认监听 `http://localhost:1323`，首次启动自动创建数据库和种子数据。

### 登录

打开浏览器访问 `http://localhost:1323`，使用默认凭证登录：

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

首次登录后建议通过 Web GUI 修改密码（或通过注册接口创建新用户后禁用 admin）。

### Docker

```bash
docker build -t config-hub .
docker run -p 1323:1323 -v $(pwd)/config-hub.db:/app/config-hub.db config-hub
```

## 核心 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 无 | 用户登录，返回 JWT |
| POST | `/api/auth/register` | 无 | 注册新用户（可通过 `ENABLE_REGISTRATION=false` 禁用） |
| GET | `/api/auth/me` | JWT | 获取当前用户信息 |
| GET | `/api/subscriptions` | JWT | 列出所有订阅源 |
| POST | `/api/subscriptions` | JWT | 添加订阅源 |
| PUT | `/api/subscriptions/:id` | JWT | 更新订阅源 |
| DELETE | `/api/subscriptions/:id` | JWT | 删除订阅源 |
| POST | `/api/subscriptions/:id/refresh` | JWT | 手动刷新订阅源 |
| GET | `/api/nodes` | JWT | 查询节点列表（支持 country/protocol/search 过滤） |
| GET | `/api/nodes/stats` | JWT | 节点统计（按国家/协议/订阅分组） |
| GET | `/api/profiles` | JWT | 列出配置档案 |
| POST | `/api/profiles` | JWT | 创建配置档案 |
| GET | `/api/profiles/:id` | JWT | 获取档案详情（含代理组和规则） |
| PUT | `/api/profiles/:id` | JWT | 更新档案设置 |
| DELETE | `/api/profiles/:id` | JWT | 删除档案 |
| POST | `/api/profiles/:id/subscriptions` | JWT | 向档案添加订阅源 |
| DELETE | `/api/profiles/:id/subscriptions/:subId` | JWT | 从档案移除订阅源 |
| POST | `/api/profiles/:id/tokens` | JWT | 生成分发 Token（仅返回一次） |
| GET | `/api/profiles/:id/tokens` | JWT | 列出档案的 Token 列表 |
| DELETE | `/api/profiles/:id/tokens/:tokenId` | JWT | 吊销 Token（软删除） |
| GET | `/api/profiles/:id/preview` | JWT | 预览生成的 YAML 配置 |
| GET | `/api/profiles/:id/export` | JWT | 下载 YAML 配置文件 |
| GET | `/sub/:profileId?token=xxx` | Token | 客户端订阅端点，返回 YAML 配置 |

## 项目结构

```
config-hub/
├── main.go                # 入口：初始化 DB/种子/Cron/路由/前端 SPA
├── embed.go               # go:embed 前端 dist 产物
├── Dockerfile             # 多阶段构建
├── go.mod / go.sum
├── db/
│   └── db.go              # SQLite 初始化（GORM + WAL + 外键约束）
├── model/                 # 数据模型定义（GORM）
│   ├── model.go           #   注册所有模型
│   ├── user.go            #   用户
│   ├── subscription.go    #   订阅源
│   ├── node.go            #   代理节点
│   ├── profile.go         #   配置档案
│   ├── proxy_group.go     #   代理组
│   ├── rule_entry.go      #   规则条目
│   └── token.go           #   分发 Token
├── seed/                  # 种子数据（idempotent）
│   ├── seed.go            #   种子执行入口
│   ├── countries.go       #   22 个国家/地区正则 + 常量定义
│   ├── proxy_groups.go    #   52 个代理组定义
│   ├── rules.go           #   37 条基础规则
│   ├── rule_providers.go  #   13 个规则提供者
│   ├── defaults.go        #   DNS / Sniffer / TUN / Geodata 默认配置
│   └── testdata.go        #   示例测试数据
├── server/                # HTTP 层（Echo 框架）
│   ├── server.go          #   路由注册
│   ├── handler/           #   请求处理
│   │   ├── auth.go        #     登录/注册/当前用户
│   │   ├── subscription.go #    订阅源 CRUD + 刷新
│   │   ├── node.go        #     节点查询 + 统计
│   │   ├── profile.go     #     档案 CRUD + 订阅关联
│   │   ├── token.go       #     Token 生成/列出/吊销
│   │   ├── export.go      #     YAML 预览 + 导出
│   │   └── sub_endpoint.go #   公共 /sub 端点
│   └── middleware/
│       └── jwt.go         #   JWT 认证 + SubToken 认证中间件
├── service/               # 业务逻辑层
│   ├── auth_jwt.go        #   JWT 生成/验证
│   ├── sub_fetcher.go     #   订阅源 HTTP 拉取（mihomo convert.ConvertsV2Ray）
│   ├── node_matcher.go    #   节点国家/落地/低倍率分类
│   ├── profile_builder.go #   配置组装（节点 + 代理组 + 规则 → YAML）
│   ├── config_template.go #   Mihomo YAML 模板结构体
│   ├── token.go           #   Token SHA-256 哈希
│   ├── cron.go            #   定时刷新调度（robfig/cron）
│   └── ssrf_guard.go      #   SSRF 防护（阻止内网 IP 访问）
└── web/                   # React 前端（Vite + TypeScript）
    ├── src/
    │   ├── pages/         #   页面组件
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   └── Subscriptions.tsx
    │   ├── api/           #   API 调用封装
    │   ├── components/    #   共用组件
    │   ├── hooks/         #   自定义 Hooks
    │   └── types/         #   TypeScript 类型定义
    ├── package.json
    └── vite.config.ts
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端语言 | Go 1.26 |
| HTTP 框架 | [Echo v4](https://echo.labstack.com/) |
| ORM | [GORM](https://gorm.io/) |
| 数据库 | SQLite（glebarez/sqlite 纯 Go 驱动） |
| 认证 | bcrypt + JWT (golang-jwt) |
| 定时任务 | robfig/cron v3 |
| 订阅解析 | Mihomo `convert.ConvertsV2Ray` |
| 前端框架 | React 19 |
| 构建工具 | Vite 8 |
| 类型系统 | TypeScript 6 |
| 拖拽交互 | dnd-kit (@dnd-kit/core) |
| 路由 | react-router-dom v7 |
| 配置格式 | Mihomo (Clash Meta) YAML |

## 安全特性

- **SSRF 防护**: 自定义 Dialer 阻止对内网/私有 IP 段的 HTTP 请求，防止订阅源 URL 被恶意利用
- **密码哈希**: bcrypt (cost=12) 存储用户密码
- **Token 安全**: 分发 Token 仅返回一次，数据库中仅存储 SHA-256 哈希
- **Token 吊销**: 支持软删除（revoked=true），吊销后立即失效
