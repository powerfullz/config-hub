package handler

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"config-hub/db"
	"config-hub/model"
	"config-hub/service"

	"github.com/labstack/echo/v4"
)

// ListSubscriptions GET /api/subscriptions
func ListSubscriptions(c echo.Context) error {
	var subs []model.Subscription
	if err := db.DB.Find(&subs).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, subs)
}

// CreateSubscription POST /api/subscriptions
func CreateSubscription(c echo.Context) error {
	var sub model.Subscription
	if err := c.Bind(&sub); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if sub.URL == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "URL is required", "code": 400})
	}
	if sub.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Name is required", "code": 400})
	}
	if sub.IntervalSecs <= 0 {
		sub.IntervalSecs = 3600
	}
	sub.UserID = c.Get("user_id").(uint)

	if err := db.DB.Create(&sub).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	service.ScheduleSubscription(sub)

	return c.JSON(http.StatusCreated, sub)
}

// updatePayload is a parse-once struct for UpdateSubscription to distinguish
// omitted fields from zero values (notably bool/Enabled).
type updatePayload struct {
	Name         *string `json:"name"`
	URL          *string `json:"url"`
	UserAgent    *string `json:"user_agent"`
	FetchProxy   *string `json:"fetch_proxy"`
	CronExpr     *string `json:"cron_expr"`
	IntervalSecs *int    `json:"interval_secs"`
	Enabled      *bool   `json:"enabled"`
}

// UpdateSubscription PUT /api/subscriptions/:id
func UpdateSubscription(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	var sub model.Subscription
	if err := db.DB.First(&sub, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}

	var input updatePayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}

	if input.Name != nil {
		sub.Name = *input.Name
	}
	if input.URL != nil {
		sub.URL = *input.URL
	}
	if input.UserAgent != nil {
		sub.UserAgent = *input.UserAgent
	}
	if input.FetchProxy != nil {
		sub.FetchProxy = *input.FetchProxy
	}
	if input.CronExpr != nil {
		sub.CronExpr = *input.CronExpr
	}
	if input.IntervalSecs != nil && *input.IntervalSecs > 0 {
		sub.IntervalSecs = *input.IntervalSecs
	}
	if input.Enabled != nil {
		sub.Enabled = *input.Enabled
	}

	if err := db.DB.Save(&sub).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	service.ScheduleSubscription(sub)

	return c.JSON(http.StatusOK, sub)
}

// DeleteSubscription DELETE /api/subscriptions/:id
func DeleteSubscription(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	// Delete associated nodes first
	db.DB.Where("subscription_id = ?", id).Delete(&model.Node{})

	if err := db.DB.Delete(&model.Subscription{}, id).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	service.UnscheduleSubscription(uint(id))

	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription deleted"})
}

// RefreshSubscription POST /api/subscriptions/:id/refresh
func RefreshSubscription(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	var sub model.Subscription
	if err := db.DB.First(&sub, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}

	result, err := service.FetchSubscription(sub.URL, sub.UserAgent, sub.FetchProxy)
	if err != nil {
		slog.Error("Subscription refresh failed", "id", id, "url", sub.URL, "error", err)
		code := http.StatusBadGateway
		errMsg := err.Error()
		if strings.Contains(errMsg, "unsupported protocol scheme") {
			code = http.StatusBadRequest
		} else if strings.Contains(errMsg, "unexpected status") {
			code = http.StatusBadGateway // proxy the upstream failure
		} else if strings.Contains(errMsg, "deadline exceeded") || strings.Contains(errMsg, "timeout") {
			code = http.StatusGatewayTimeout
		} else if strings.Contains(errMsg, "no such host") {
			code = http.StatusNotFound
		} else if strings.Contains(errMsg, "SSRF guard") {
			code = http.StatusForbidden
		}
		return c.JSON(code, echo.Map{
			"error": "Failed to fetch subscription: " + errMsg,
			"code":  code,
		})
	}

	// Delete old nodes for this subscription
	db.DB.Where("subscription_id = ?", sub.ID).Delete(&model.Node{})

	// Classify and save new nodes
	now := time.Now()
	for _, nodeConfig := range result.Nodes {
		name := service.ExtractNodeName(nodeConfig)
		if name == "" {
			continue
		}
		country, _, _ := service.ClassifyNode(nodeConfig)
		node := model.Node{
			SubscriptionID: sub.ID,
			Name:           name,
			Type:           service.ExtractNodeType(nodeConfig),
			Server:         service.ExtractNodeServer(nodeConfig),
			Port:           service.ExtractNodePort(nodeConfig),
			Protocol:       service.ExtractNodeType(nodeConfig),
			Country:        country,
			RawConfig:      service.NodeToJSON(nodeConfig),
			UpdatedAt:      now,
		}
		db.DB.Create(&node)
	}

	// Update subscription metadata
	sub.LastFetchedAt = &now
	sub.NodeCount = len(result.Nodes)
	if result.TrafficInfo != "" {
		sub.TrafficInfo = result.TrafficInfo
	}
	db.DB.Save(&sub)

	return c.JSON(http.StatusOK, echo.Map{
		"message":    "Subscription refreshed",
		"node_count": len(result.Nodes),
		"traffic":    result.TrafficInfo,
	})
}
