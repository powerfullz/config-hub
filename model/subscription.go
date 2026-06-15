package model

import "time"

type Subscription struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	UserID        uint       `gorm:"index;not null" json:"user_id"`
	Name          string     `gorm:"not null" json:"name"`
	URL           string     `gorm:"not null" json:"url"`
	UserAgent     string     `json:"user_agent"`
	CronExpr      string     `json:"cron_expr"`       // e.g. "@every 3600s" for robfig/cron
	IntervalSecs  int        `gorm:"default:3600" json:"interval_secs"`
	LastFetchedAt *time.Time `json:"last_fetched_at"`
	NodeCount     int        `json:"node_count"`
	TrafficInfo   string     `gorm:"type:text" json:"traffic_info"` // raw subscription-userinfo header
	Enabled       bool       `gorm:"default:true" json:"enabled"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	Nodes []Node `gorm:"foreignKey:SubscriptionID" json:"nodes,omitempty"`
}
