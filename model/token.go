package model

import "time"

type Token struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	ProfileID  uint       `gorm:"index;not null" json:"profile_id"`
	TokenHash  string     `gorm:"uniqueIndex;not null" json:"-"` // SHA-256 hash
	Name       string     `json:"name"`
	LastUsedAt *time.Time `json:"last_used_at"`
	Revoked    bool       `gorm:"default:false" json:"revoked"`
	CreatedAt  time.Time  `json:"created_at"`
}
