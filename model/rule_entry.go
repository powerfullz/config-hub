package model

type RuleEntry struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ProfileID uint   `gorm:"index;not null" json:"profile_id"`
	RuleText  string `gorm:"not null" json:"rule_text"` // e.g. "GEOSITE,youtube,YouTube"
	SortOrder int    `gorm:"default:0" json:"sort_order"`
}
