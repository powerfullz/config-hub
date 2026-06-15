# AGENTS.md — config-hub

## Build Order (Critical)

Frontend MUST be built before the Go binary. `embed.go` uses `//go:embed web/dist/*` to embed the SPA at compile time. Missing `web/dist/` is a hard compile error.

```
cd web && pnpm run build    # outputs web/dist/
cd .. && CGO_ENABLED=0 go build -o config-hub .
```

## Subscription Converter (Remote Dependency)

The subscription parsing code uses mihomo's `common/convert` package as a direct `go.mod` dependency (`github.com/metacubex/mihomo v1.19.27`). No local `replace` directive needed — `go build` automatically fetches the remote module. It handles 11 protocols: ss, ssr, vmess, vless, trojan, hysteria, hysteria2, tuic, socks, http, anytls, mierus.

Entry point: `convert.ConvertsV2Ray(buf []byte) ([]map[string]any, error)` imported from `"github.com/metacubex/mihomo/common/convert"`.

## SQLite Driver

This project uses `github.com/glebarez/sqlite` (pure-Go, no CGO). Do NOT switch to `gorm.io/driver/sqlite` (requires `mattn/go-sqlite3` + CGO). The open call is `sqlite.Open(dbPath)` imported from `"github.com/glebarez/sqlite"` — note the separate import, not just the blank-import side-effect pattern.

## CGO_ENABLED=0

Always build with `CGO_ENABLED=0`. The glebarez driver is pure Go. Enabling CGO pulls in a C compiler requirement for no benefit and changes the import path.

## Auth: Two Channels

- **Admin API** (`/api/*`): Bearer JWT (HS256, 24h). Middleware sets `c.Set("user_id", userID)` where `userID` is `uint`. Extract via `c.Get("user_id").(uint)`.
- **Sub endpoint** (`/sub/:profileId?token=xxx`): 32-byte hex token stored as SHA-256 hash in the `tokens` table. Middleware sets `c.Set("profile_id", ...)`. No JWT involved. The raw token is returned once at creation — it cannot be recovered later.

The only auth middleware file is `server/middleware/jwt.go` (contains both `JWTAuth` and `SubTokenAuth`).

## Handler Conventions

- Error responses: `c.JSON(code, echo.Map{"code": code, "error": msg})` — always a map, never a bare string, always includes the HTTP code as both status and body field.
- Partial updates: use pointer types (`*string`, `*bool`, `*int`) so `nil` means "not provided" vs. pointer-to-zero meaning "set to empty/false/0".
- Route params: parsed via `strconv.ParseUint(c.Param("id"), 10, 32)` at the top of every handler that takes `:id`.
- Multi-table mutations use GORM transactions (e.g., deleting a profile cascades through tokens → rules → proxy groups → profile).

## YAML Output Ordering

The `ConfigTemplate` struct in `service/config_template.go` has fields ordered to match the mihomo YAML specification: `port` → `proxies` → `proxy-groups` → `rules` → `dns` → `tun` → `sniffer`. Changing field order changes the generated YAML key order (`gopkg.in/yaml.v3` respects struct field order). Mihomo is sensitive to this ordering.

## Web Dev vs Production

- **Dev**: `cd web && pnpm dev` (Vite on :5173), proxying `/api` and `/sub` to `http://localhost:1323`. The Go backend must run separately: `go run .`.
- **Prod**: `pnpm build` then `CGO_ENABLED=0 go build -o config-hub .` — the binary serves `web/dist/` as an SPA via Echo's `StaticWithConfig` with `HTML5: true` (SPA fallback).

Do NOT run `pnpm dev` and expect the Go binary to serve the frontend — it serves `web/dist/`, not the dev server output.

## Seed Data Idempotency

- `seed.Run()`: skips if `User` table count > 0. Creates admin user (admin with randomly generated password (24 hex chars) logged via slog.Info on first startup, bcrypt), default profile, 52 proxy groups, 37 rules, DNS/sniffer/TUN defaults.
- `seed.InsertSampleData()`: skips if a subscription named "测试订阅" exists. Creates one test subscription + 17 nodes across 8 countries.

Fresh clones get a blank DB (`.gitignore` includes `config-hub.db`), so seed always runs on first launch.

## SSRF Guard

`service.InitSafeHTTPClient()` creates a singleton HTTP client that blocks requests to RFC1918 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and cloud metadata IPs. Subscription URLs resolving to these ranges will fail. This is by design. For local testing, use subscription URLs that resolve to public IPs.

## Regex

All regex patterns are compiled via `regexp.MustCompile` using Go's RE2 engine (not PCRE/JS). Features like `(?i)`, `\b`, and `\x{HHHHHH}` work. Lookahead/lookbehind do NOT. The country-matching patterns in `service/node_matcher.go` and seed data use RE2-compatible syntax throughout.

## Go Version

`go.mod` declares `go 1.26.3`. If tooling rejects this version, try `go1.23.x` — the codebase uses no cutting-edge language features.
