# 项目结构 / Project Structure

## 目录结构

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
│   ├── subscription_group.go #   组合订阅
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
│   │   ├── subscription_group.go # 组合订阅 CRUD
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
    │   ├── main.tsx       #   入口：I18nProvider + BrowserRouter
    │   ├── App.tsx        #   路由定义
    │   ├── api/
    │   │   └── client.ts  #   API 调用封装（fetch wrapper, JWT auth）
    │   ├── components/
    │   │   ├── Layout.tsx     #   App 壳：Header + 导航 + 内容区 + 语言切换
    │   │   ├── ProfileEditor.tsx  #   方案创建/编辑 Modal
    │   │   └── TokenManager.tsx   #   分发 Token CRUD
    │   ├── hooks/
    │   │   └── useAuth.ts  #   认证状态 Hook
    │   ├── i18n/               #   国际化
    │   │   ├── index.tsx       #     i18next 初始化 + I18nProvider（含 antd locale 同步）
    │   │   └── locales/
    │   │       ├── zh-CN/      #     中文（默认）
    │   │       │   ├── common.json
    │   │       │   ├── dashboard.json
    │   │       │   ├── profileEditor.json
    │   │       │   └── subscriptions.json
    │   │       └── en/         #     英文
    │   │           ├── common.json
    │   │           ├── dashboard.json
    │   │           ├── profileEditor.json
    │   │           └── subscriptions.json
    │   ├── pages/
    │   │   ├── Dashboard.tsx   #  方案列表 + 代理组/规则 + YAML 预览
    │   │   ├── Login.tsx       #  登录页
    │   │   └── Subscriptions.tsx   #  订阅管理
    │   ├── theme/
    │   │   ├── themeConfig.ts  #   Ant Design 主题 Token
    │   │   ├── globalStyles.ts #   全局 Emotion CSS
    │   │   └── index.ts
    │   └── types/
    │       └── index.ts        #   TypeScript 接口定义
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

## 技术栈 / Tech Stack

| 层级      | 技术                                  |
| --------- | ------------------------------------- |
| 后端语言  | Go 1.26                               |
| HTTP 框架 | [Echo v4](https://echo.labstack.com/) |
| ORM       | [GORM](https://gorm.io/)              |
| 数据库    | SQLite（glebarez/sqlite 纯 Go 驱动）  |
| 认证      | bcrypt + JWT (golang-jwt)             |
| 定时任务  | robfig/cron v3                        |
| 订阅解析  | Mihomo `convert.ConvertsV2Ray`（远程依赖） |
| 前端框架  | React 19                              |
| UI 库     | Ant Design 6                          |
| 国际化    | i18next + react-i18next（zh-CN / en）  |
| 构建工具  | Vite 8                                |
| 类型系统  | TypeScript 6                          |
| 拖拽交互  | dnd-kit (@dnd-kit/core)               |
| 路由      | react-router-dom v7                   |
| 配置格式  | Mihomo (Clash Meta) YAML              |

## 国际化 / i18n

- **框架**: i18next + react-i18next
- **默认语言**: 简体中文 (zh-CN)，英文 (en) 作为备选
- **命名空间**: 4 个 — `common`（布局/登录/共享按钮）、`dashboard`、`subscriptions`、`profileEditor`
- **语言检测**: localStorage → 浏览器语言 → 回退 zh-CN
- **Ant Design 本地化**: 通过 `I18nProvider` 自动同步 antd 组件语言
- **语言切换**: Header 中/EN 按钮，实时切换无需刷新
- **翻译文件**: 以 JSON 形式打包（~4KB），零运行时开销

## 安全特性 / Security

- **SSRF 防护**: 自定义 Dialer 阻止对内网/私有 IP 段的 HTTP 请求，防止订阅源 URL 被恶意利用
- **密码哈希**: bcrypt (cost=12) 存储用户密码
- **Token 安全**: 分发 Token 仅返回一次，数据库中仅存储 SHA-256 哈希
- **Token 吊销**: 支持软删除（revoked=true），吊销后立即失效
