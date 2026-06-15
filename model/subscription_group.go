package model

import "time"

// SubscriptionGroup is a combined group of subscriptions.
// It merges nodes from all member subscriptions into one virtual source.
type SubscriptionGroup struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	UserID uint   `gorm:"index;not null" json:"user_id"`
	Name   string `gorm:"not null" json:"name"`

	Subscriptions []Subscription `gorm:"many2many:group_subscriptions;" json:"subscriptions,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}
