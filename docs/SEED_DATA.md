# Seed Data Reference

应用首次启动时，`seed.Run()` 自动初始化以下数据。操作是 idempotent 的：如果 `User` 表已有记录，则跳过所有种子操作。

---

## 默认管理员

| 用户名 | 密码 (bcrypt, cost=12) |
|--------|------------------------|
| `admin` | `admin123` |

首次登录后建议修改密码。

---

## 默认配置档案

自动创建一个名为 `Default` 的配置档案：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `name` | `"Default"` | 档案名称 |
| `description` | `"默认配置档案"` | 档案描述 |
| `group_type` | `1` | 代理组类型 |
| `landing` | `false` | 落地节点开关 |
| `ipv6` | `false` | IPv6 支持 |
| `tun` | `false` | TUN 模式 |
| `keep_alive` | `true` | TCP keep-alive |
| `fake_ip` | `false` | Fake-IP DNS |
| `quic` | `true` | QUIC 支持 |
| `regex_filter` | `"all"` | 节点过滤模式 |
| `country_threshold` | `0` | 国家节点数阈值 |

---

## 22 个国家/地区正则

`seed/countries.go` 定义了 22 个节点名称匹配正则。节点在拉取后自动通过正则匹配分类到对应国家。

| # | 地区 | 权重 | 正则要点 |
|---|------|------|----------|
| 1 | 香港 | 10 | 港, HK, Hong Kong, 深港, HKG, 九龙, 新界 |
| 2 | 澳门 | 0 | 澳门, MO, Macau |
| 3 | 台湾 | 20 | 台, TW, Taiwan, TPE, ROC |
| 4 | 新加坡 | 30 | 新加坡, SG, Singapore, SIN |
| 5 | 日本 | 40 | 日本, JP, Japan, 东京, 大阪, NRT, HND, KIX |
| 6 | 韩国 | 45 | 韩国, KR, Korea, 首尔, ICN |
| 7 | 美国 | 50 | 美国, US, USA, 洛杉矶, 纽约, LAX, SFO, JFK |
| 8 | 加拿大 | 55 | 加拿大, CA, Canada, 温哥华, YVR, YYZ |
| 9 | 英国 | 60 | 英国, UK, Britain, 伦敦, LHR, MAN |
| 10 | 澳大利亚 | 0 | 澳洲, AU, Australia |
| 11 | 德国 | 70 | 德国, DE, Germany, 法兰克福, 慕尼黑 |
| 12 | 法国 | 80 | 法国, FR, France, 巴黎, CDG |
| 13 | 俄罗斯 | 0 | 俄罗斯, RU, Russia |
| 14 | 泰国 | 0 | 泰国, TH, Thailand |
| 15 | 印度 | 0 | 印度, IN, India |
| 16 | 马来西亚 | 0 | 马来西亚, MY, Malaysia |
| 17 | 阿根廷 | 0 | 阿根廷, AR, Argentina |
| 18 | 芬兰 | 0 | 芬兰, FI, Finland |
| 19 | 埃及 | 0 | 埃及, EG, Egypt |
| 20 | 菲律宾 | 0 | 菲律宾, PH, Philippines |
| 21 | 土耳其 | 0 | 土耳其, TR, Turkey |
| 22 | 乌克兰 | 0 | 乌克兰, UA, Ukraine |

> 权重为 0 的地区在排序中靠后（无显式权重）。每个正则匹配节点名称中的中文名、英文名、城市名和机场代码缩写。

每个国家使用 jsDelivr CDN 加载 Qure 图标集对应的国旗图片。

### 特殊分类正则

| 分类 | 正则 | 用途 |
|------|------|------|
| 低倍率节点 | `(?i)0\.[0-5]\|低倍率\|省流\|实验性` | 匹配倍率 0.0-0.5 的节点 |
| 落地节点 | `(?i)家宽\|家庭宽带\|商宽\|商业宽带\|星链\|Starlink\|落地` | 匹配家宽/商宽/星链节点 |

---

## 52 个代理组

`seed/proxy_groups.go` 定义了所有代理组，按 `sort_order` 排序（1-52）。

### 静态代理组 (1-30)

| 顺序 | 名称 | 类型 | 代理列表 | 特殊属性 |
|------|------|------|----------|----------|
| 1 | 选择代理 | select | [自动选择, 故障转移, 手动选择] | — |
| 2 | 手动选择 | select | [] | `include-all: true` |
| 3 | 静态资源 | select | [选择代理, 手动选择, DIRECT] | — |
| 4 | AI服务 | select | [选择代理, 手动选择, DIRECT] | — |
| 5 | 加密货币 | select | [选择代理, 手动选择, DIRECT] | — |
| 6 | 苹果服务 | select | [选择代理, 手动选择, DIRECT] | — |
| 7 | 谷歌服务 | select | [选择代理, 手动选择, DIRECT] | — |
| 8 | 微软服务 | select | [选择代理, 手动选择, DIRECT] | — |
| 9 | Xbox | select | [选择代理, 手动选择, DIRECT] | — |
| 10 | Github | select | [选择代理, 手动选择, DIRECT] | — |
| 11 | 哔哩哔哩 | select | [DIRECT, 选择代理, 手动选择] | DIRECT 优先 |
| 12 | 巴哈姆特 | select | [选择代理, 手动选择, DIRECT] | — |
| 13 | Youtube | select | [选择代理, 手动选择, DIRECT] | — |
| 14 | Twitch | select | [选择代理, 手动选择, DIRECT] | — |
| 15 | Netflix | select | [选择代理, 手动选择, DIRECT] | — |
| 16 | TikTok | select | [选择代理, 手动选择, DIRECT] | — |
| 17 | Spotify | select | [选择代理, 手动选择, DIRECT] | — |
| 18 | Telegram | select | [选择代理, 手动选择, DIRECT] | — |
| 19 | Twitter | select | [选择代理, 手动选择, DIRECT] | — |
| 20 | 新浪微博 | select | [DIRECT, 选择代理, 手动选择] | `include-all: true`, DIRECT 优先 |
| 21 | Truth Social | select | [选择代理, 手动选择, DIRECT] | — |
| 22 | E-Hentai | select | [选择代理, 手动选择, DIRECT] | — |
| 23 | PikPak网盘 | select | [选择代理, 手动选择, DIRECT] | — |
| 24 | 搜狗输入法 | select | [DIRECT, REJECT] | — |
| 25 | SSH | select | [选择代理, 手动选择, DIRECT] | — |
| 26 | Final | select | [选择代理, DIRECT] | 兜底规则组 |
| 27 | 自动选择 | url-test | [所有国家组] | interval=60s, tolerance=20ms |
| 28 | 故障转移 | fallback | [所有国家组] | interval=60s, tolerance=20ms |
| 29 | 广告拦截 | select | [REJECT, REJECT-DROP, DIRECT] | — |
| 30 | 低倍率节点 | url-test | [] | `include-all: true`, `filter: 低倍率正则`, interval=60s |

### 国家代理组 (31-52)

每个国家一个 `url-test` 组，配置：

| 属性 | 值 |
|------|-----|
| `type` | `url-test` |
| `include-all` | `true` |
| `filter` | 对应国家的正则 |
| `url` | `https://cp.cloudflare.com/generate_204` |
| `interval` | `60` 秒 |
| `tolerance` | `20` ms |

国家组命名格式：`{中文名}节点`（如"香港节点"、"日本节点"）。

### 代理列表占位符说明

在 `proxies` JSON 中出现的名称与实际解析行为：

| 名称 | 行为 |
|------|------|
| `"DIRECT"` | Mihomo 内置直连 |
| `"REJECT"` | Mihomo 内置拒绝 |
| `"REJECT-DROP"` | Mihomo 内置拒绝丢包 |
| `"选择代理"` / `"手动选择"` / etc. | 引用同档案中的其他代理组名 |
| `"香港节点"` / `"日本节点"` / etc. | 通过 `resolveProxyNames` 映射，实际使用 `include-all + filter` |

---

## 37 条基础规则

`seed/rules.go` 定义了 37 条 Mihomo 规则，按 `sort_order` 排序（1-37）。

| 顺序 | 规则文本 | 说明 |
|------|----------|------|
| 1 | `DST-PORT,22,SSH` | SSH 端口走 SSH 组 |
| 2 | `GEOIP,private,DIRECT,no-resolve` | 私有 IP 直连 |
| 3 | `RULE-SET,ADBlock,广告拦截` | 广告域名拦截 |
| 4 | `RULE-SET,AdditionalFilter,广告拦截` | 附加广告拦截 |
| 5 | `RULE-SET,SogouInput,搜狗输入法` | 搜狗输入法规则 |
| 6 | `DOMAIN-SUFFIX,truthsocial.com,Truth Social` | Truth Social 域名 |
| 7 | `RULE-SET,StaticResources,静态资源` | CDN 静态资源 |
| 8 | `RULE-SET,CDNResources,静态资源` | CDN 资源 (classical) |
| 9 | `RULE-SET,AdditionalCDNResources,静态资源` | 附加 CDN 资源 |
| 10 | `GEOSITE,category-ai-!cn,AI服务` | AI 服务域名 |
| 11 | `GEOSITE,bilibili,哔哩哔哩` | 哔哩哔哩 |
| 12 | `GEOSITE,youtube,Youtube` | YouTube |
| 13 | `GEOSITE,telegram,Telegram` | Telegram 域名 |
| 14 | `GEOIP,telegram,Telegram,no-resolve` | Telegram IP |
| 15 | `GEOSITE,xbox,Xbox` | Xbox |
| 16 | `GEOSITE,github,Github` | GitHub |
| 17 | `GEOSITE,netflix,Netflix` | Netflix 域名 |
| 18 | `GEOSITE,twitch,Twitch` | Twitch |
| 19 | `GEOIP,netflix,Netflix,no-resolve` | Netflix IP |
| 20 | `GEOSITE,spotify,Spotify` | Spotify |
| 21 | `GEOSITE,bahamut,巴哈姆特` | 巴哈姆特 |
| 22 | `GEOSITE,pikpak,PikPak网盘` | PikPak 网盘 |
| 23 | `GEOSITE,twitter,Twitter` | Twitter |
| 24 | `RULE-SET,Weibo,新浪微博` | 新浪微博 |
| 25 | `RULE-SET,EHentai,E-Hentai` | E-Hentai |
| 26 | `RULE-SET,TikTok,TikTok` | TikTok |
| 27 | `RULE-SET,SteamFix,DIRECT` | Steam 社区直连 |
| 28 | `RULE-SET,GoogleFCM,DIRECT` | Firebase 消息直连 |
| 29 | `GEOSITE,google-play@cn,DIRECT` | Google Play 中国直连 |
| 30 | `GEOSITE,microsoft@cn,DIRECT` | 微软中国直连 |
| 31 | `GEOSITE,apple,苹果服务` | Apple 服务 |
| 32 | `GEOSITE,microsoft,微软服务` | 微软服务 |
| 33 | `GEOSITE,google,谷歌服务` | 谷歌服务 |
| 34 | `RULE-SET,Crypto,加密货币` | 加密货币 |
| 35 | `RULE-SET,GFWList,选择代理` | GFWList 走代理 |
| 36 | `GEOIP,cn,DIRECT` | 中国 IP 直连 |
| 37 | `MATCH,Final` | 兜底规则 |

---

## 13 个规则提供者 (Rule Providers)

`seed/rule_providers.go` 定义了 13 个规则提供者，用于 Mihomo 定时更新规则集。

| 名称 | 类型 | Behavior | Format | 间隔 | 来源 |
|------|------|----------|--------|------|------|
| `ADBlock` | http | domain | yaml | 86400s | 217heidai/adblockfilters |
| `SogouInput` | http | classical | text | 86400s | ruleset.skk.moe |
| `StaticResources` | http | domain | text | 86400s | ruleset.skk.moe |
| `CDNResources` | http | classical | text | 86400s | ruleset.skk.moe |
| `TikTok` | http | classical | text | 86400s | powerfullz/override-rules |
| `EHentai` | http | classical | text | 86400s | powerfullz/override-rules |
| `SteamFix` | http | classical | text | 86400s | powerfullz/override-rules |
| `GoogleFCM` | http | classical | text | 86400s | powerfullz/override-rules |
| `AdditionalFilter` | http | classical | text | 86400s | powerfullz/override-rules |
| `AdditionalCDNResources` | http | classical | text | 86400s | powerfullz/override-rules |
| `Crypto` | http | classical | text | 86400s | powerfullz/override-rules |
| `Weibo` | http | classical | text | 86400s | powerfullz/override-rules |
| `GFWList` | http | domain | yaml | 86400s | Loyalsoldier/clash-rules |

所有 provider 的更新间隔均为 86400 秒（24 小时）。本地缓存路径为 `./ruleset/{name}.{ext}`。

---

## DNS 默认配置

`seed/defaults.go` — `DefaultDNS`:

```yaml
enable: true
ipv6: false
prefer-h3: true
enhanced-mode: redir-host
default-nameserver:
  - 119.29.29.29
  - 223.5.5.5
nameserver:
  - system
  - 223.5.5.5
  - 119.29.29.29
  - 180.184.1.1
fallback:
  - quic://dns0.eu
  - https://dns.cloudflare.com/dns-query
  - https://dns.sb/dns-query
  - tcp://208.67.222.222
  - tcp://8.26.56.2
proxy-server-nameserver:
  - https://dns.alidns.com/dns-query
  - tls://dot.pub
```

当档案启用 `fake_ip` 时，`enhanced-mode` 切换为 `fake-ip`，并追加 `fake-ip-filter`：

```yaml
fake-ip-filter:
  - geosite:private
  - geosite:connectivity-check
  - Mijia Cloud
  - dig.io.mi.com
  - localhost.ptlogin2.qq.com
  - "*.icloud.com"
  - "*.stun.*.*"
  - "*.stun.*.*.*"
```

---

## Sniffer 默认配置

`seed/defaults.go` — `DefaultSniffer`:

```yaml
enable: true
override-destination: false
force-dns-mapping: true
sniff:
  TLS:
    ports: [443, 8443]
  HTTP:
    ports: [80, 8080, 8880]
  QUIC:
    ports: [443, 8443]
skip-domain:
  - Mijia Cloud
  - dlg.io.mi.com
  - "+.push.apple.com"
```

---

## TUN 默认配置

`seed/defaults.go` — `DefaultTUN`（仅当档案 `tun: true` 时包含在输出中）:

```yaml
enable: false
stack: gvisor
device: mihomo
route-exclude-address:
  - 100.64.0.0/10
  - fd7a:115c:a1e0::/48
  - 192.168.0.0/16
  - fd00::/8
dns-hijack:
  - "any:53"
mtu: 1500
```

---

## Geodata 下载地址

`seed/defaults.go` — `DefaultGeodata`:

| 文件 | URL |
|------|-----|
| `geoip.dat` | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat` |
| `geosite.dat` | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat` |

这两个 URL 在配置 YAML 的 `geox-url` 段中使用，Mihomo 客户端自动下载 geodata 文件。
