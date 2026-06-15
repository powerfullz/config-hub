package service

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"config-hub/db"
	"config-hub/model"

	"github.com/robfig/cron/v3"
)

var (
	cronScheduler *cron.Cron
	cronJobs      = make(map[uint]cron.EntryID)
	cronMu        sync.Mutex
)

// InitCron initializes the cron scheduler and loads all enabled subscriptions.
func InitCron() {
	cronScheduler = cron.New(cron.WithLocation(time.Local))

	// Load all enabled subscriptions
	var subs []model.Subscription
	if err := db.DB.Where("enabled = ?", true).Find(&subs).Error; err != nil {
		slog.Error("Failed to load subscriptions for cron", "error", err)
		return
	}

	for _, sub := range subs {
		ScheduleSubscription(sub)
	}

	cronScheduler.Start()
	slog.Info("Cron scheduler started", "jobs", len(subs))
}

// ScheduleSubscription adds or updates a cron job for a subscription.
func ScheduleSubscription(sub model.Subscription) {
	cronMu.Lock()
	defer cronMu.Unlock()

	// Remove existing job if any
	if entryID, exists := cronJobs[sub.ID]; exists {
		cronScheduler.Remove(entryID)
		delete(cronJobs, sub.ID)
	}

	if !sub.Enabled {
		slog.Debug("Subscription disabled, skipping cron", "id", sub.ID, "name", sub.Name)
		return
	}

	// Build cron expression
	cronExpr := sub.CronExpr
	if cronExpr == "" {
		if sub.IntervalSecs > 0 {
			cronExpr = everySeconds(sub.IntervalSecs)
		} else {
			cronExpr = "@every 1h"
		}
	}

	subID := sub.ID
	entryID, err := cronScheduler.AddFunc(cronExpr, func() {
		refreshSubByID(subID)
	})

	if err != nil {
		slog.Error("Failed to schedule subscription", "id", sub.ID, "name", sub.Name, "error", err)
		return
	}

	cronJobs[sub.ID] = entryID
	slog.Info("Subscription scheduled", "id", sub.ID, "name", sub.Name, "cron", cronExpr)
}

// UnscheduleSubscription removes a cron job for a subscription.
func UnscheduleSubscription(subID uint) {
	cronMu.Lock()
	defer cronMu.Unlock()

	if entryID, exists := cronJobs[subID]; exists {
		cronScheduler.Remove(entryID)
		delete(cronJobs, subID)
		slog.Info("Subscription unscheduled", "id", subID)
	}
}

func everySeconds(secs int) string {
	return "@every " + formatDuration(time.Duration(secs)*time.Second)
}

func formatDuration(d time.Duration) string {
	hours := int(d.Hours())
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if hours > 0 {
		return fmt.Sprintf("%dh%dm%ds", hours, minutes, seconds)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm%ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}

func refreshSubByID(subID uint) {
	var sub model.Subscription
	if err := db.DB.First(&sub, subID).Error; err != nil {
		slog.Error("Cron: subscription not found", "id", subID, "error", err)
		return
	}

	slog.Info("Cron: refreshing subscription", "id", sub.ID, "name", sub.Name, "url", sub.URL)

	result, err := FetchSubscription(sub.URL, sub.UserAgent, sub.FetchProxy)
	if err != nil {
		slog.Error("Cron: fetch failed", "id", sub.ID, "name", sub.Name, "error", err)
		return
	}

	// Delete old nodes
	db.DB.Where("subscription_id = ?", sub.ID).Delete(&model.Node{})

	// Save new nodes
	now := time.Now()
	for _, nodeConfig := range result.Nodes {
		name := ExtractNodeName(nodeConfig)
		if name == "" {
			continue
		}
		country, _, _ := ClassifyNode(nodeConfig)
		node := model.Node{
			SubscriptionID: sub.ID,
			Name:           name,
			Type:           ExtractNodeType(nodeConfig),
			Server:         ExtractNodeServer(nodeConfig),
			Port:           ExtractNodePort(nodeConfig),
			Protocol:       ExtractNodeType(nodeConfig),
			Country:        country,
			RawConfig:      NodeToJSON(nodeConfig),
			UpdatedAt:      now,
		}
		db.DB.Create(&node)
	}

	// Update metadata
	sub.LastFetchedAt = &now
	sub.NodeCount = len(result.Nodes)
	if result.TrafficInfo != "" {
		sub.TrafficInfo = result.TrafficInfo
	}
	db.DB.Save(&sub)

	slog.Info("Cron: subscription refreshed", "id", sub.ID, "nodes", len(result.Nodes))
}

// RefreshAllSubscriptions refreshes all enabled subscriptions immediately.
func RefreshAllSubscriptions() {
	var subs []model.Subscription
	if err := db.DB.Where("enabled = ?", true).Find(&subs).Error; err != nil {
		slog.Error("Failed to load subscriptions for refresh", "error", err)
		return
	}

	for _, sub := range subs {
		refreshSubByID(sub.ID)
	}
}
