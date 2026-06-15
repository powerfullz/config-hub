package seed

import (
	"encoding/json"
	"log/slog"

	"config-hub/db"
	"config-hub/model"
)

// InsertSampleData inserts test nodes directly into the database, bypassing
// subscription fetching. A sample subscription is created under user 1, and
// ~17 nodes with varied protocols are inserted across 8+ countries.
//
// The operation is idempotent — if a subscription named "测试订阅" already
// exists, insertion is skipped.
func InsertSampleData() error {
	var existing model.Subscription
	if err := db.DB.Where("name = ?", "测试订阅").First(&existing).Error; err == nil {
		slog.Info("Test data already exists, skipping")
		return nil
	}

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create sample subscription.
	sub := model.Subscription{
		UserID:   1,
		Name:     "测试订阅",
		URL:      "https://example.com/sub",
		Enabled:  true,
	}
	if err := tx.Create(&sub).Error; err != nil {
		tx.Rollback()
		return err
	}

	nodes := buildSampleNodes(sub.ID)

	// Validate RawConfig JSON before inserting.
	for i := range nodes {
		if !json.Valid([]byte(nodes[i].RawConfig)) {
			slog.Warn("Node has invalid RawConfig JSON, skipping",
				"name", nodes[i].Name,
			)
			continue
		}
		if err := tx.Create(&nodes[i]).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Associate subscription with the default profile.
	var defaultProfile model.Profile
	if err := tx.Where("name = ?", "Default").First(&defaultProfile).Error; err == nil {
		if err := tx.Model(&defaultProfile).Association("Subscriptions").Append(&sub); err != nil {
			tx.Rollback()
			return err
		}
		slog.Info("Associated subscription with default profile",
			"profile", defaultProfile.Name,
			"subscription", sub.Name,
		)
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	slog.Info("Sample test data inserted",
		"subscription", sub.Name,
		"nodes", len(nodes),
	)
	return nil
}

func buildSampleNodes(subID uint) []model.Node {
	type nodeData struct {
		name     string
		server   string
		port     int
		protocol string
		country  string
		config   string
	}

	defs := []nodeData{
		// ── 香港 (Hong Kong) ──
		{
			name: "HK-01-A | 香港IEPL", server: "hk1.example.com", port: 443,
			protocol: "vmess", country: "香港",
			config:   `{"name":"HK-01-A | 香港IEPL","type":"vmess","server":"hk1.example.com","port":443,"uuid":"b831381d-6324-4d53-ad4f-8cda48b30811","alterId":0,"cipher":"auto","network":"ws","ws-opts":{"path":"/hk-iepl"},"tls":true}`,
		},
		{
			name: "HK-02-B", server: "hk2.example.com", port: 443,
			protocol: "vless", country: "香港",
			config:   `{"name":"HK-02-B","type":"vless","server":"hk2.example.com","port":443,"uuid":"c942492e-7435-5e64-be50-9deb59c41922","flow":"xtls-rprx-vision","network":"tcp","tls":true,"servername":"hk2.example.com"}`,
		},
		// ── 日本 (Japan) ──
		{
			name: "JP-01 | 日本东京", server: "jp1.example.com", port: 443,
			protocol: "trojan", country: "日本",
			config:   `{"name":"JP-01 | 日本东京","type":"trojan","server":"jp1.example.com","port":443,"password":"trojan-2024-secure","network":"tcp","tls":true,"sni":"jp1.example.com"}`,
		},
		{
			name: "JP-02 | Japan Osaka", server: "jp2.example.com", port: 8388,
			protocol: "ss", country: "日本",
			config:   `{"name":"JP-02 | Japan Osaka","type":"ss","server":"jp2.example.com","port":8388,"cipher":"aes-256-gcm","password":"ss-pass-osaka-2024"}`,
		},
		// ── 美国 (United States) ──
		{
			name: "US-01 | 美西洛杉矶", server: "us1.example.com", port: 443,
			protocol: "hysteria2", country: "美国",
			config:   `{"name":"US-01 | 美西洛杉矶","type":"hysteria2","server":"us1.example.com","port":443,"password":"hy2-la-secure","sni":"us1.example.com"}`,
		},
		{
			name: "US-02 | United States NY", server: "us2.example.com", port: 443,
			protocol: "vmess", country: "美国",
			config:   `{"name":"US-02 | United States NY","type":"vmess","server":"us2.example.com","port":443,"uuid":"d053594f-8546-7f75-cf61-afef70da6333","alterId":0,"cipher":"auto","network":"grpc","grpc-opts":{"grpc-service-name":"ny-proxy"},"tls":true}`,
		},
		// ── 新加坡 (Singapore) ──
		{
			name: "SG-01 | 新加坡1", server: "sg1.example.com", port: 443,
			protocol: "vless", country: "新加坡",
			config:   `{"name":"SG-01 | 新加坡1","type":"vless","server":"sg1.example.com","port":443,"uuid":"e1646a5f-9653-4306-bf72-cbc7629f8d44","flow":"","network":"ws","ws-opts":{"path":"/sg-fast"},"tls":true}`,
		},
		{
			name: "SG-02 | Singapore", server: "sg2.example.com", port: 443,
			protocol: "trojan", country: "新加坡",
			config:   `{"name":"SG-02 | Singapore","type":"trojan","server":"sg2.example.com","port":443,"password":"trojan-sg-2024","network":"tcp","tls":true,"sni":"sg2.example.com"}`,
		},
		// ── 台湾 (Taiwan) ──
		{
			name: "TW-01 | 台湾Hinet", server: "tw1.example.com", port: 443,
			protocol: "tuic", country: "台湾",
			config:   `{"name":"TW-01 | 台湾Hinet","type":"tuic","server":"tw1.example.com","port":443,"uuid":"f2757b60-9630-4417-c082-ddc863a01655","password":"tuic-tw-pass","congestion-controller":"bbr","sni":"tw1.example.com"}`,
		},
		{
			name: "TW-02", server: "tw2.example.com", port: 8388,
			protocol: "ss", country: "台湾",
			config:   `{"name":"TW-02","type":"ss","server":"tw2.example.com","port":8388,"cipher":"chacha20-ietf-poly1305","password":"ss-tw-pass-2024"}`,
		},
		// ── 韩国 (Korea) ──
		{
			name: "KR-01 | Korea Seoul", server: "kr1.example.com", port: 443,
			protocol: "hysteria2", country: "韩国",
			config:   `{"name":"KR-01 | Korea Seoul","type":"hysteria2","server":"kr1.example.com","port":443,"password":"hy2-seoul-pass","sni":"kr1.example.com"}`,
		},
		// ── 英国 (United Kingdom) ──
		{
			name: "UK-01 | 英国伦敦", server: "uk1.example.com", port: 443,
			protocol: "vmess", country: "英国",
			config:   `{"name":"UK-01 | 英国伦敦","type":"vmess","server":"uk1.example.com","port":443,"uuid":"a0b1c2d3-e4f5-6789-abcd-ef0123456789","alterId":0,"cipher":"auto","network":"tcp","tls":true}`,
		},
		// ── 德国 (Germany) ──
		{
			name: "DE-01 | Germany Frankfurt", server: "de1.example.com", port: 443,
			protocol: "vless", country: "德国",
			config:   `{"name":"DE-01 | Germany Frankfurt","type":"vless","server":"de1.example.com","port":443,"uuid":"f1e2d3c4-b5a6-7890-1234-567890abcdef","flow":"xtls-rprx-vision","network":"tcp","tls":true,"servername":"de1.example.com"}`,
		},
		// ── 落地节点 (Landing nodes) ──
		{
			name: "落地-01 | 香港家宽", server: "landing-hk.example.com", port: 443,
			protocol: "trojan", country: "香港",
			config:   `{"name":"落地-01 | 香港家宽","type":"trojan","server":"landing-hk.example.com","port":443,"password":"landing-hk-pass","network":"tcp","tls":true,"sni":"landing-hk.example.com"}`,
		},
		{
			name: "Starlink-SG | 新加坡", server: "starlink-sg.example.com", port: 443,
			protocol: "vmess", country: "新加坡",
			config:   `{"name":"Starlink-SG | 新加坡","type":"vmess","server":"starlink-sg.example.com","port":443,"uuid":"11111111-2222-3333-4444-555555555555","alterId":0,"cipher":"auto","network":"ws","ws-opts":{"path":"/starlink"},"tls":true}`,
		},
		// ── 低倍率节点 (Low-cost nodes) ──
		{
			name: "低倍率-HK | 香港", server: "lowcost-hk.example.com", port: 443,
			protocol: "ss", country: "香港",
			config:   `{"name":"低倍率-HK | 香港","type":"ss","server":"lowcost-hk.example.com","port":8388,"cipher":"aes-128-gcm","password":"lowcost-hk-2024"}`,
		},
		{
			name: "0.5x-JP | 日本", server: "lowcost-jp.example.com", port: 443,
			protocol: "hysteria2", country: "日本",
			config:   `{"name":"0.5x-JP | 日本","type":"hysteria2","server":"lowcost-jp.example.com","port":443,"password":"lowcost-jp-pass","sni":"lowcost-jp.example.com"}`,
		},
	}

	nodes := make([]model.Node, len(defs))
	for i, d := range defs {
		nodes[i] = model.Node{
			SubscriptionID: subID,
			Name:           d.name,
			Server:         d.server,
			Port:           d.port,
			Protocol:       d.protocol,
			Country:        d.country,
			RawConfig:      d.config,
		}
	}

	return nodes
}
