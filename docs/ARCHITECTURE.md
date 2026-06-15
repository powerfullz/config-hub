# Architecture

Config Hub 的架构设计与数据流说明。

## 整体架构

```
┌──────────────────────────────────────────────────────┐
│                    React SPA (web/)                  │
│  Login → Dashboard → Subscriptions → Profile Editor │
└──────────────────────┬───────────────────────────────┘
                       │ REST API (JWT / Token)
┌──────────────────────▼───────────────────────────────┐
│              Echo HTTP Server (server/)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ JWTAuth  │  │ Handlers │  │ SubToken │           │
│  │Middleware│  │          │  │Middleware│           │
│  └──────────┘  └────┬─────┘  └──────────┘           │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│              Service Layer (service/)                │
│  Auth │ Fetcher │ Matcher │ Builder │ Cron │ Guard  │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│              SQLite (db/) + GORM                     │
│  User │ Subscription │ Node │ Profile │ PG │ Rule   │
└──────────────────────────────────────────────────────┘
```

## 数据流

```
订阅 URL → HTTP 拉取 → mihomo convert.ConvertsV2Ray
    → 节点解析为 []map[string]any
    → 节点分类（按国家 / 落地 / 低倍率）
    → 存入 SQLite (Node 表)
    → Profile Builder 读取 Profile 关联的 Subscription → 取出所有 Node
    → 组装代理组 (proxy-groups) + 规则 (rules) + DNS/Sniffer
    → YAML 渲染输出
```

### 详细步骤

1. 用户通过 Web GUI 添加订阅 URL
2. 系统立即拉取一次订阅（支持 3 次重试 + 指数退避）
3. `convert.ConvertsV2Ray(body)` 将 Base64/原始代理配置解析为标准 proxy 对象数组
4. `ClassifyNode()` 对每个节点执行正则匹配：
   - 匹配 22 个国家/地区正则 → 标记 `Country`
   - 匹配低倍率正则 → 标记低倍率节点
   - 匹配落地正则 → 标记落地节点
5. 节点存入 `Node` 表，关联到所属 `Subscription`
6. 用户创建/编辑 `Profile`，选择关联哪些订阅源
7. `BuildConfig()` 从档案关联的订阅中取出所有节点
8. 按 `ProxyGroup` 定义组装代理组列表（包括动态的国家分组和手动选择组）
9. 输出完整的 `ConfigTemplate` → YAML

## 认证流程

### 管理后台 (Web GUI)

```
用户名/密码 → bcrypt.CompareHashAndPassword
    → 验证成功 → 生成 JWT (HS256, 24h)
    → 前端在 Authorization: Bearer <token> 中携带
    → JWTAuth Middleware 解析 token → 设置 user_id 到 Context
```

### 客户端订阅 (/sub)

```
profile_token → SHA-256 哈希 → 查询 Token 表
    → 匹配 profile_id + 未吊销
    → 返回 YAML 配置
```

**Token 安全设计**:
- 生成时使用 `crypto/rand` 生成 32 字节随机数，hex 编码为 64 字符
- 仅返回一次原始 Token，数据库只存储 SHA-256 哈希
- 支持吊销（soft delete: `revoked=true`）
- 中间件和 Handler 双重验证确保 Token 匹配正确的 Profile

## 定时刷新

```
应用启动 → InitCron() → 加载所有 enabled=true 的订阅
    → 按 IntervalSecs 创建 cron job
    → 每个 job: FetchSubscription() → 删除旧节点 → 保存新节点
```

- 框架: robfig/cron v3
- 支持自定义 cron 表达式 (`cron_expr` 字段)，默认按 `interval_secs` 生成
- 订阅创建/更新/启用/禁用时动态调整 cron job
- 订阅删除时移除对应 job

## 关键设计决策

### 1. 单文件部署

前端 React SPA 通过 `//go:embed web/dist/*` 嵌入 Go 二进制。Echo 的 `StaticWithConfig` 使用 `HTML5: true` 实现 SPA fallback — 所有非 API 路径返回 `index.html`。一个二进制文件即可运行。

### 2. 种子数据 idempotent

所有种子数据（用户 Profile、代理组、规则）在 `seed.Run()` 中通过检查 `User` 表是否有记录来判断是否已初始化。种子数据 idempotent，重复运行不会产生重复数据。

### 3. 代理组使用 include-all + filter

国家代理组不显式列出所有节点名称，而是使用 Mihomo 的 `include-all: true` + `filter` 正则。优点：
- YAML 配置更简洁
- 节点增减无需更新配置文件
- 客户端自行匹配节点

### 4. SSRF 防护

自定义 `SafeDialer` + `http.Transport` 阻止对内网地址的 HTTP 请求：
- 屏蔽私有 IP (10.x, 172.16, 192.168)
- 屏蔽环回地址 (127.x, ::1)
- 屏蔽链路本地地址 (169.254.x, fe80::)
- 屏蔽 AWS/GCP 元数据端点
- DNS 解析后二次检查 + 重定向目标检查 + 实际连接地址检查

### 5. Parse Don't Validate

Profile 的创建和更新接口使用指针类型的 payload struct（`*string`, `*bool`, `*int`），区分字段"未传递"与"传递了零值"，安全地应用默认值。详见 `handler/profile.go` 中的 `createProfilePayload` 和 `updateProfilePayload`。

### 6. GORM 模型设计

- `User` 1:N `Subscription` (foreignKey: UserID)
- `User` 1:N `Profile` (foreignKey: UserID)
- `Subscription` 1:N `Node` (foreignKey: SubscriptionID)
- `Profile` N:M `Subscription` (many2many: profile_subscriptions)
- `Profile` 1:N `ProxyGroup` (foreignKey: ProfileID)
- `Profile` 1:N `RuleEntry` (foreignKey: ProfileID)
- `Profile` 1:N `Token` (foreignKey: ProfileID)

### 7. 节点提取器

`service/sub_fetcher.go` 提供了一组节点字段提取函数：
- `ExtractNodeName` — 从 proxy 对象中提取 name（用作显示名和分类依据）
- `ExtractNodeType` — 提取协议类型（vmess, trojan, ss, etc.）
- `ExtractNodeServer` — 提取服务器地址
- `ExtractNodePort` — 提取端口号
- `NodeToJSON` — 将整个 proxy 对象序列化为 JSON 存储
