# API Reference

所有 API 以 `/api` 为前缀（`/sub` 除外）。管理后台接口使用 JWT Bearer Token 认证，客户端订阅接口使用 query parameter Token。

---

## 认证机制

| 认证方式 | 适用范围 | Header / Query |
|----------|----------|----------------|
| JWT (HS256) | `/api/*` (除 `/api/auth/login`, `/api/auth/register`) | `Authorization: Bearer <token>` |
| SubToken | `/sub/*` | `?token=<raw_token>` |

---

## 公共接口

### `POST /api/auth/login`

用户登录，返回 JWT Token（有效期 24 小时）。

```
Method: POST
Auth:   无
```

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response `200 OK`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 400 | `{"error": "Username and password are required", "code": 400}` |
| 401 | `{"error": "Invalid credentials", "code": 401}` |
| 500 | `{"error": "Failed to generate token", "code": 500}` |

---

### `POST /api/auth/register`

注册新用户。可通过环境变量 `ENABLE_REGISTRATION=false` 禁用。

```
Method: POST
Auth:   无
```

**Request Body:**

```json
{
  "username": "newuser",
  "password": "mypassword"
}
```

**Response `201 Created`:**

```json
{
  "id": 2,
  "username": "newuser"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 400 | `{"error": "Username and password are required", "code": 400}` |
| 403 | `{"error": "Registration is disabled", "code": 403}` |
| 409 | `{"error": "Username already exists", "code": 409}` |
| 500 | `{"error": "Failed to hash password", "code": 500}` |

---

### `GET /api/auth/me`

获取当前登录用户信息。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "id": 1,
  "username": "admin",
  "created_at": "2026-01-01T00:00:00Z",
  "subscriptions": [],
  "profiles": []
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 401 | `{"error": "Not authenticated", "code": 401}` |
| 404 | `{"error": "User not found", "code": 404}` |

---

### `GET /health`

健康检查端点。

```
Method: GET
Auth:   无
```

**Response `200 OK`:**

```json
{
  "status": "ok"
}
```

---

## 订阅源 (Subscriptions)

### `GET /api/subscriptions`

列出所有订阅源。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "My Airport",
    "url": "https://example.com/sub?token=xxx",
    "user_agent": "clash-verge/v2.2.3",
    "cron_expr": "",
    "interval_secs": 3600,
    "last_fetched_at": "2026-06-15T10:00:00Z",
    "node_count": 42,
    "traffic_info": "upload=1234; download=5678; total=10737418240; expire=1735689600",
    "enabled": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-06-15T10:00:00Z"
  }
]
```

**Error Responses:**

| Code | Body |
|------|------|
| 500 | `{"error": "...", "code": 500}` |

---

### `POST /api/subscriptions`

创建新的订阅源。创建后自动加入定时刷新调度。

```
Method: POST
Auth:   JWT
```

**Request Body:**

```json
{
  "name": "My Airport",
  "url": "https://example.com/sub?token=xxx",
  "user_agent": "clash-verge/v2.2.3",
  "interval_secs": 3600,
  "cron_expr": "",
  "enabled": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | 订阅源名称 |
| `url` | string | Yes | — | 订阅 URL |
| `user_agent` | string | No | `""` | 自定义 User-Agent |
| `interval_secs` | int | No | `3600` | 定时刷新间隔（秒） |
| `cron_expr` | string | No | `""` | 自定义 cron 表达式（优先级高于 interval_secs） |
| `enabled` | bool | No | `true` | 是否启用 |

**Response `201 Created`:**

```json
{
  "id": 1,
  "user_id": 1,
  "name": "My Airport",
  "url": "https://example.com/sub?token=xxx",
  "user_agent": "clash-verge/v2.2.3",
  "cron_expr": "",
  "interval_secs": 3600,
  "enabled": true,
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-15T10:00:00Z"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 400 | `{"error": "URL is required", "code": 400}` |
| 400 | `{"error": "Name is required", "code": 400}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `PUT /api/subscriptions/:id`

部分更新订阅源（仅更新传递的字段，指针区分省略和零值）。

```
Method: PUT
Auth:   JWT
```

**Request Body (all fields optional):**

```json
{
  "name": "New Name",
  "url": "https://new.example.com/sub?token=xxx",
  "user_agent": "v2rayN/6.23",
  "cron_expr": "0 */6 * * *",
  "interval_secs": 21600,
  "enabled": false
}
```

**Response `200 OK`:** 返回更新后的完整订阅对象。

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 404 | `{"error": "Subscription not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `DELETE /api/subscriptions/:id`

删除订阅源及其所有关联节点。自动取消定时任务。

```
Method: DELETE
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "message": "Subscription deleted"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `POST /api/subscriptions/:id/refresh`

手动触发订阅刷新。拉取订阅 URL → 删除旧节点 → 解析新节点 → 分类存储。

```
Method: POST
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "message": "Subscription refreshed",
  "node_count": 42,
  "traffic": "upload=1234; download=5678; total=10737418240; expire=1735689600"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 404 | `{"error": "Subscription not found", "code": 404}` |
| 502 | `{"error": "Failed to fetch subscription: ...", "code": 502}` |

---

## 节点 (Nodes)

### `GET /api/nodes`

查询节点列表。支持多条件筛选。

```
Method: GET
Auth:   JWT
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `subscription_id` | int | 按订阅源筛选 |
| `country` | string | 按国家筛选（如"香港"） |
| `protocol` | string | 按协议类型筛选（如"vmess"） |
| `search` | string | 按节点名称模糊搜索 |

> 未指定 `subscription_id` 时，自动限定当前用户的订阅源。

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "subscription_id": 1,
    "name": "HK-01 | 香港",
    "type": "vmess",
    "server": "hk1.example.com",
    "port": 443,
    "protocol": "vmess",
    "country": "香港",
    "latency": 0,
    "raw_config": "{\"name\":\"HK-01\",\"type\":\"vmess\",...}",
    "updated_at": "2026-06-15T10:00:00Z",
    "created_at": "2026-06-15T10:00:00Z"
  }
]
```

**Error Responses:**

| Code | Body |
|------|------|
| 500 | `{"error": "...", "code": 500}` |

---

### `GET /api/nodes/stats`

获取节点池的聚合统计信息。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "total_nodes": 128,
  "nodes_by_country": {
    "香港": 35,
    "日本": 22,
    "新加坡": 18,
    "美国": 15,
    "": 10
  },
  "nodes_by_protocol": {
    "vmess": 60,
    "vless": 30,
    "trojan": 20,
    "ss": 10,
    "hysteria2": 8
  },
  "nodes_by_subscription": {
    "1": 42,
    "2": 86
  }
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 500 | `{"error": "...", "code": 500}` |

---

## 配置档案 (Profiles)

### `GET /api/profiles`

列出当前用户的所有配置档案。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Default",
    "description": "默认配置档案",
    "group_type": 1,
    "landing": false,
    "ipv6": false,
    "tun": false,
    "keep_alive": true,
    "fake_ip": false,
    "quic": true,
    "regex_filter": "all",
    "country_threshold": 0,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

**Error Responses:**

| Code | Body |
|------|------|
| 500 | `{"error": "...", "code": 500}` |

---

### `POST /api/profiles`

创建新配置档案，自动初始化 52 个代理组 + 37 条规则。

```
Method: POST
Auth:   JWT
```

**Request Body:**

```json
{
  "name": "My Profile",
  "description": "我的自定义配置",
  "group_type": 1,
  "landing": true,
  "ipv6": false,
  "tun": true,
  "keep_alive": true,
  "fake_ip": false,
  "quic": true,
  "regex_filter": "all",
  "country_threshold": 3
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | 档案名称 |
| `description` | string | No | `""` | 档案描述 |
| `group_type` | int | No | `1` | 代理组类型（0/1/2） |
| `landing` | bool | No | `false` | 是否启用落地节点 |
| `ipv6` | bool | No | `false` | 是否启用 IPv6 |
| `tun` | bool | No | `false` | 是否启用 TUN 模式 |
| `keep_alive` | bool | No | `true` | 是否启用 keep-alive |
| `fake_ip` | bool | No | `false` | 是否启用 Fake-IP DNS |
| `quic` | bool | No | `true` | 是否启用 QUIC |
| `regex_filter` | string | No | `"all"` | 节点过滤模式 |
| `country_threshold` | int | No | `0` | 国家节点数阈值 |

**Response `201 Created`:**

返回完整的 Profile 对象（不包含关联数据）。

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 400 | `{"error": "Name is required", "code": 400}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `GET /api/profiles/:id`

获取档案详情，预加载代理组（按 `sort_order` 排序）和规则。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "id": 1,
  "user_id": 1,
  "name": "Default",
  "description": "默认配置档案",
  "group_type": 1,
  "landing": false,
  "ipv6": false,
  "tun": false,
  "keep_alive": true,
  "fake_ip": false,
  "quic": true,
  "regex_filter": "all",
  "country_threshold": 0,
  "proxy_groups": [
    {
      "id": 1,
      "profile_id": 1,
      "name": "选择代理",
      "type": "select",
      "icon": "",
      "sort_order": 1,
      "proxies": "[\"自动选择\",\"故障转移\",\"手动选择\"]",
      "include_all": false,
      "filter": "",
      "exclude_filter": "",
      "url": "",
      "interval": 300,
      "tolerance": 50,
      "strategy": ""
    }
  ],
  "rules": [
    {
      "id": 1,
      "profile_id": 1,
      "rule_text": "DST-PORT,22,SSH",
      "sort_order": 1
    }
  ],
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |

---

### `PUT /api/profiles/:id`

部分更新档案设置。

```
Method: PUT
Auth:   JWT
```

**Request Body (all fields optional):**

```json
{
  "name": "New Name",
  "description": "Updated description",
  "tun": true,
  "fake_ip": true
}
```

**Response `200 OK`:** 返回更新后的完整 Profile 对象。

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `DELETE /api/profiles/:id`

级联删除档案及其代理组、规则和 Token（事务内执行）。

```
Method: DELETE
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "message": "Profile deleted"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `POST /api/profiles/:id/subscriptions`

向档案添加订阅源（多对多关联）。

```
Method: POST
Auth:   JWT
```

**Request Body:**

```json
{
  "subscription_id": 1
}
```

**Response `200 OK`:**

```json
{
  "message": "Subscription added to profile"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 404 | `{"error": "Subscription not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `DELETE /api/profiles/:id/subscriptions/:subId`

从档案移除订阅源。

```
Method: DELETE
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "message": "Subscription removed from profile"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 400 | `{"error": "Invalid subscription ID", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 404 | `{"error": "Subscription not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `POST /api/profiles/:id/tokens`

生成分发 Token。Token 仅在创建时返回一次（后续无法获取原始值）。

```
Method: POST
Auth:   JWT
```

**Request Body:**

```json
{
  "name": "My Phone"
}
```

**Response `201 Created`:**

```json
{
  "id": 1,
  "token": "a1b2c3d4e5f6...", // 64-char hex string, returned ONCE
  "name": "My Phone",
  "created_at": "2026-06-15T10:00:00Z"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 400 | `{"error": "Invalid request body", "code": 400}` |
| 400 | `{"error": "Name is required", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 500 | `{"error": "Failed to generate token", "code": 500}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `GET /api/profiles/:id/tokens`

列出档案的所有 Token（仅元数据，不包含原始 Token 值）。

```
Method: GET
Auth:   JWT
```

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "profile_id": 1,
    "name": "My Phone",
    "last_used_at": "2026-06-15T12:00:00Z",
    "revoked": false,
    "created_at": "2026-06-15T10:00:00Z"
  }
]
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 404 | `{"error": "Profile not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `DELETE /api/profiles/:id/tokens/:tokenId`

吊销 Token（软删除，`revoked=true`）。吊销后立即失效。

```
Method: DELETE
Auth:   JWT
```

**Response `200 OK`:**

```json
{
  "message": "Token revoked"
}
```

或（已吊销）:

```json
{
  "message": "Token already revoked"
}
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 400 | `{"error": "Invalid token ID", "code": 400}` |
| 404 | `{"error": "Token not found", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `GET /api/profiles/:id/preview`

预览档案的 YAML 配置输出（返回纯文本 YAML）。

```
Method: GET
Auth:   JWT
Content-Type: text/plain; charset=utf-8
```

**Response `200 OK`:**

```yaml
port: 7890
socks-port: 7891
mixed-port: 7890
mode: rule
# ... full mihomo config
```

**Error Responses:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid ID", "code": 400}` |
| 404 | `{"error": "profile not found: ...", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

### `GET /api/profiles/:id/export`

下载档案的 YAML 配置文件（`Content-Disposition: attachment`）。

```
Method: GET
Auth:   JWT
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename=config.yaml
```

**Error Responses:** 同 Preview。

---

## 客户端订阅端点

### `GET /sub/:profileId`

客户端订阅端点，通过 Token 认证，返回 YAML 配置。

```
Method: GET
Auth:   SubToken (query param ?token=xxx)
```

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `token` | Yes | 分发 Token（64 位 hex 字符串） |

**Response `200 OK`:**

```yaml
port: 7890
socks-port: 7891
mixed-port: 7890
mode: rule
# ... full mihomo config
```

响应头包含 `Content-Disposition: attachment; filename="config-hub-{profileId}.yaml"`。

每次请求会异步更新 Token 的 `last_used_at` 字段（失败不影响响应）。

**错误响应:**

| Code | Body |
|------|------|
| 400 | `{"error": "Invalid profile ID", "code": 400}` |
| 401 | `{"error": "Token required", "code": 401}` |
| 401 | `{"error": "Invalid token", "code": 401}` |
| 403 | `{"error": "Token has been revoked", "code": 403}` |
| 404 | `{"error": "profile not found: ...", "code": 404}` |
| 500 | `{"error": "...", "code": 500}` |

---

## 通用错误格式

所有错误响应遵循统一格式：

```json
{
  "error": "Human-readable error message",
  "code": 400
}
```

| HTTP Status | 说明 |
|-------------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 / Token 已吊销 / 注册已禁用 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如用户名已存在） |
| 500 | 服务器内部错误 |
| 502 | 上游请求失败（订阅源拉取失败） |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `1323` | 服务监听端口 |
| `ENABLE_REGISTRATION` | `true` | 设为 `false` 禁用注册接口 |
