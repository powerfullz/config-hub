package model

import "time"

type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Username     string         `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string         `gorm:"not null" json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	Subscriptions []Subscription `gorm:"foreignKey:UserID" json:"subscriptions,omitempty"`
	Profiles     []Profile       `gorm:"foreignKey:UserID" json:"profiles,omitempty"`
}
