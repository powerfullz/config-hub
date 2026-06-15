package handler

import (
	"net/http"
	"strconv"

	"config-hub/db"
	"config-hub/model"

	"github.com/labstack/echo/v4"
)

// ListNodes GET /api/nodes
// Supports query params: subscription_id, country, protocol, search (name contains).
// If no explicit subscription_id is provided, results are scoped to the
// authenticated user's subscriptions.
func ListNodes(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	query := db.DB.Model(&model.Node{})

	// Filter by subscription_id, or scope to the user's subscriptions.
	if subID := c.QueryParam("subscription_id"); subID != "" {
		if id, err := strconv.ParseUint(subID, 10, 64); err == nil {
			query = query.Where("subscription_id = ?", id)
		}
	} else {
		var subIDs []uint
		db.DB.Model(&model.Subscription{}).Where("user_id = ?", userID).Pluck("id", &subIDs)
		if len(subIDs) == 0 {
			return c.JSON(http.StatusOK, []model.Node{})
		}
		query = query.Where("subscription_id IN ?", subIDs)
	}

	// Filter by country
	if country := c.QueryParam("country"); country != "" {
		query = query.Where("country = ?", country)
	}

	// Filter by protocol (type)
	if protocol := c.QueryParam("protocol"); protocol != "" {
		query = query.Where("type = ?", protocol)
	}

	// Search by name
	if search := c.QueryParam("search"); search != "" {
		query = query.Where("name LIKE ?", "%"+search+"%")
	}

	var nodes []model.Node
	if err := query.Order("subscription_id ASC, country ASC, name ASC").Find(&nodes).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	if nodes == nil {
		nodes = []model.Node{}
	}

	return c.JSON(http.StatusOK, nodes)
}

// GetNodeStatistics GET /api/nodes/stats
// Returns aggregate statistics about the node pool
func GetNodeStatistics(c echo.Context) error {
	type Stats struct {
		TotalNodes          int64            `json:"total_nodes"`
		NodesByCountry      map[string]int64 `json:"nodes_by_country"`
		NodesByProtocol     map[string]int64 `json:"nodes_by_protocol"`
		NodesBySubscription map[uint]int64   `json:"nodes_by_subscription"`
	}

	stats := Stats{
		NodesByCountry:      make(map[string]int64),
		NodesByProtocol:     make(map[string]int64),
		NodesBySubscription: make(map[uint]int64),
	}

	// Total count
	db.DB.Model(&model.Node{}).Count(&stats.TotalNodes)

	// By country
	type CountryCount struct {
		Country string
		Count   int64
	}
	var countryCounts []CountryCount
	db.DB.Model(&model.Node{}).Select("country, count(*) as count").Group("country").Scan(&countryCounts)
	for _, cc := range countryCounts {
		stats.NodesByCountry[cc.Country] = cc.Count
	}

	// By protocol
	type ProtocolCount struct {
		Type  string
		Count int64
	}
	var protocolCounts []ProtocolCount
	db.DB.Model(&model.Node{}).Select("type, count(*) as count").Group("type").Scan(&protocolCounts)
	for _, pc := range protocolCounts {
		stats.NodesByProtocol[pc.Type] = pc.Count
	}

	// By subscription
	type SubCount struct {
		SubscriptionID uint
		Count          int64
	}
	var subCounts []SubCount
	db.DB.Model(&model.Node{}).Select("subscription_id, count(*) as count").Group("subscription_id").Scan(&subCounts)
	for _, sc := range subCounts {
		stats.NodesBySubscription[sc.SubscriptionID] = sc.Count
	}

	return c.JSON(http.StatusOK, stats)
}
