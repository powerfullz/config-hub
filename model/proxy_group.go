package model

type ProxyGroup struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	ProfileID     uint   `gorm:"index;not null" json:"profile_id"`
	Name          string `gorm:"not null" json:"name"`
	Type          string `gorm:"default:select" json:"type"` // select, url-test, load-balance, fallback
	Icon          string `json:"icon"`
	SortOrder     int    `gorm:"default:0" json:"sort_order"`
	Proxies       string `gorm:"type:text" json:"proxies"` // JSON string array
	IncludeAll    bool   `json:"include_all"`
	Filter        string `json:"filter"`
	ExcludeFilter string `json:"exclude_filter"`
	URL           string `json:"url"`
	Interval      int    `gorm:"default:300" json:"interval"` // seconds, for url-test
	Tolerance     int    `gorm:"default:50" json:"tolerance"` // ms, for url-test
	Strategy      string `json:"strategy"`
}
