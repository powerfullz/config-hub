package service

import (
	"fmt"
	"strings"

	"config-hub/db"
	"config-hub/model"

	"gorm.io/gorm"
)

type ValidationMessage struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

type ValidationResult struct {
	Valid    bool                `json:"valid"`
	Messages []ValidationMessage `json:"messages"`
}

func ValidateConfig(profileID uint) (*ValidationResult, error) {
	var profile model.Profile
	if err := db.DB.
		Preload("Subscriptions").
		Preload("SubscriptionGroups.Subscriptions").
		Preload("Rules", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Preload("ProxyGroups", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		First(&profile, profileID).Error; err != nil {
		return nil, fmt.Errorf("profile not found: %w", err)
	}

	result := &ValidationResult{Valid: true}

	subIDs := collectSubIDs(profile.Subscriptions, profile.SubscriptionGroups)
	if len(subIDs) == 0 {
		result.Valid = false
		result.Messages = append(result.Messages, ValidationMessage{
			Level:   "error",
			Message: "Profile has no subscriptions. Add at least one subscription to generate a config.",
			Field:   "subscriptions",
		})
	}

	if len(profile.Rules) == 0 {
		result.Valid = false
		result.Messages = append(result.Messages, ValidationMessage{
			Level:   "error",
			Message: "Profile has no rules. Add at least one rule (e.g., MATCH,DIRECT).",
			Field:   "rules",
		})
	}

	hasMatch := false
	for _, r := range profile.Rules {
		parts := strings.SplitN(r.RuleText, ",", 3)
		if len(parts) < 2 {
			result.Messages = append(result.Messages, ValidationMessage{
				Level:   "warning",
				Message: fmt.Sprintf("Rule '%s' has invalid format (expected TYPE,VALUE[,GROUP]).", r.RuleText),
				Field:   "rules",
			})
			continue
		}
		ruleType := strings.ToUpper(parts[0])
		if ruleType == "MATCH" {
			hasMatch = true
		}
		if ruleType == "DOMAIN" || ruleType == "DOMAIN-SUFFIX" || ruleType == "DOMAIN-KEYWORD" {
			if len(parts) < 3 {
				result.Messages = append(result.Messages, ValidationMessage{
					Level:   "warning",
					Message: fmt.Sprintf("Rule '%s' is missing the proxy group target.", r.RuleText),
					Field:   "rules",
				})
			}
		}
	}
	if len(profile.Rules) > 0 && !hasMatch {
		result.Messages = append(result.Messages, ValidationMessage{
			Level:   "warning",
			Message: "No MATCH rule found. Traffic not matching any rule will be dropped.",
			Field:   "rules",
		})
	}

	if len(profile.ProxyGroups) > 0 {
		groupNames := make(map[string]bool, len(profile.ProxyGroups))
		for _, g := range profile.ProxyGroups {
			groupNames[g.Name] = true
		}
		for _, r := range profile.Rules {
			parts := strings.SplitN(r.RuleText, ",", 3)
			if len(parts) < 3 {
				continue
			}
			target := strings.TrimSpace(parts[2])
			if target == "" || target == "DIRECT" || target == "REJECT" || target == "REJECT-DROP" {
				continue
			}
			if !groupNames[target] {
				result.Messages = append(result.Messages, ValidationMessage{
					Level:   "warning",
					Message: fmt.Sprintf("Rule '%s' references proxy group '%s' which is not defined in custom proxy groups.", r.RuleText, target),
					Field:   "rules",
				})
			}
		}
	}

	config, err := BuildConfig(profileID)
	if err != nil {
		if len(subIDs) > 0 {
			result.Valid = false
			result.Messages = append(result.Messages, ValidationMessage{
				Level:   "error",
				Message: fmt.Sprintf("Failed to build config: %s", err.Error()),
				Field:   "config",
			})
		}
		return result, nil
	}

	if _, err := config.Render(); err != nil {
		result.Valid = false
		result.Messages = append(result.Messages, ValidationMessage{
			Level:   "error",
			Message: fmt.Sprintf("YAML rendering failed: %s", err.Error()),
			Field:   "config",
		})
	}

	if len(config.Proxies) == 0 {
		result.Messages = append(result.Messages, ValidationMessage{
			Level:   "warning",
			Message: "No proxy nodes found in subscriptions. Config will have empty proxies list.",
			Field:   "proxies",
		})
	}

	return result, nil
}
