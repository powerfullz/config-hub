package model

import "time"

type Node struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	SubscriptionID uint      `gorm:"index;not null" json:"subscription_id"`
	Name           string    `gorm:"not null" json:"name"`
	Type           string    `json:"type"` // vmess, vless, trojan, ss, ssr, hysteria2, etc.
	Server         string    `json:"server"`
	Port           int       `json:"port"`
	Protocol       string    `json:"protocol"`
	Country        string    `gorm:"index" json:"country"`
	Latency        int       `json:"latency"`
	RawConfig      string    `gorm:"type:text" json:"raw_config"` // JSON-encoded original proxy config
	UpdatedAt      time.Time `json:"updated_at"`
	CreatedAt      time.Time `json:"created_at"`
}
