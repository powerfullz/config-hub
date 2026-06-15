package model

import "time"

type Profile struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	UserID    uint   `gorm:"index;not null" json:"user_id"`
	Name      string `gorm:"not null" json:"name"`
	GroupType int    `gorm:"default:0" json:"group_type"` // 0=select, 1=url-test, 2=load-balance
	Landing   bool   `gorm:"default:false" json:"landing"`   // 启用落地节点功能
	IPv6      bool   `gorm:"default:false" json:"ipv6"`     // 启用 IPv6 支持
	TUN       bool   `gorm:"default:false" json:"tun"`      // 启用 TUN 模式
	Full      bool   `gorm:"default:false" json:"full"`     // 输出完整配置（纯内核启动）
	KeepAlive bool   `gorm:"default:false" json:"keep_alive"` // 启用 tcp-keep-alive
	FakeIP    bool   `gorm:"default:true" json:"fake_ip"`   // DNS 使用 FakeIP 模式
	QUIC      bool   `gorm:"default:false" json:"quic"`     // 允许 QUIC 流量
	Regex     bool   `gorm:"default:false" json:"regex"`    // 使用正则过滤模式（include-all + filter）
	Threshold int    `gorm:"default:0" json:"threshold"`     // 地区节点数量阈值
	FileName    string `gorm:"default:''" json:"file_name"` // 自定义导出文件名
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Subscriptions      []Subscription      `gorm:"many2many:profile_subscriptions;" json:"subscriptions,omitempty"`
	SubscriptionGroups []SubscriptionGroup `gorm:"many2many:profile_subscription_groups;" json:"subscription_groups,omitempty"`
	ProxyGroups        []ProxyGroup        `gorm:"foreignKey:ProfileID" json:"proxy_groups,omitempty"`
	Rules              []RuleEntry         `gorm:"foreignKey:ProfileID" json:"rules,omitempty"`
	Tokens             []Token             `gorm:"foreignKey:ProfileID" json:"tokens,omitempty"`
}
