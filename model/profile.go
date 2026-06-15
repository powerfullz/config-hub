package model

import "time"

type Profile struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	UserID           uint       `gorm:"index;not null" json:"user_id"`
	Name             string     `gorm:"not null" json:"name"`
	Description      string     `json:"description"`
	GroupType        int        `gorm:"default:1" json:"group_type"` // 0, 1, 2
	Landing          bool       `gorm:"default:false" json:"landing"`
	IPv6             bool       `gorm:"default:false" json:"ipv6"`
	TUN              bool       `gorm:"default:false" json:"tun"`
	KeepAlive        bool       `gorm:"default:true" json:"keep_alive"`
	FakeIP           bool       `gorm:"default:false" json:"fake_ip"`
	QUIC             bool       `gorm:"default:true" json:"quic"`
	RegexFilter      string     `gorm:"default:all" json:"regex_filter"`
	CountryThreshold int        `gorm:"default:0" json:"country_threshold"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	Subscriptions []Subscription `gorm:"many2many:profile_subscriptions;" json:"subscriptions,omitempty"`
	ProxyGroups   []ProxyGroup   `gorm:"foreignKey:ProfileID" json:"proxy_groups,omitempty"`
	Rules         []RuleEntry    `gorm:"foreignKey:ProfileID" json:"rules,omitempty"`
	Tokens        []Token        `gorm:"foreignKey:ProfileID" json:"tokens,omitempty"`
}
