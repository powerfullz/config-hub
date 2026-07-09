package service

import (
	"fmt"
	"net"
	"strings"

	"config-hub/db"
	"config-hub/model"

	"gorm.io/gorm"
)

type RuleMatchResult struct {
	Matched  bool   `json:"matched"`
	RuleText string `json:"rule_text,omitempty"`
	RuleType string `json:"rule_type,omitempty"`
	Group    string `json:"group,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

func TestRule(profileID uint, input string) (*RuleMatchResult, error) {
	var profile model.Profile
	if err := db.DB.
		Preload("Rules", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		First(&profile, profileID).Error; err != nil {
		return nil, fmt.Errorf("profile not found: %w", err)
	}

	if len(profile.Rules) == 0 {
		return &RuleMatchResult{Matched: false, Reason: "Profile has no rules"}, nil
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return &RuleMatchResult{Matched: false, Reason: "Empty input"}, nil
	}

	isIP := net.ParseIP(input) != nil
	isDomain := !isIP && strings.Contains(input, ".")

	for _, r := range profile.Rules {
		parts := strings.SplitN(r.RuleText, ",", 3)
		if len(parts) < 2 {
			continue
		}
		ruleType := strings.ToUpper(parts[0])
		ruleValue := strings.TrimSpace(parts[1])
		group := ""
		if len(parts) >= 3 {
			group = strings.TrimSpace(parts[2])
		}

		switch ruleType {
		case "DOMAIN":
			if isDomain && strings.EqualFold(input, ruleValue) {
				return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("Exact domain match: %s", ruleValue)}, nil
			}
		case "DOMAIN-SUFFIX":
			if isDomain && strings.HasSuffix(strings.ToLower(input), strings.ToLower(ruleValue)) {
				return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("Domain suffix match: .%s", ruleValue)}, nil
			}
		case "DOMAIN-KEYWORD":
			if isDomain && strings.Contains(strings.ToLower(input), strings.ToLower(ruleValue)) {
				return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("Domain keyword match: %s", ruleValue)}, nil
			}
		case "IP-CIDR", "IP-CIDR6", "SRC-IP-CIDR":
			if isIP {
				_, cidr, err := net.ParseCIDR(ruleValue)
				if err == nil && cidr.Contains(net.ParseIP(input)) {
					return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("IP in CIDR: %s", ruleValue)}, nil
				}
			}
		case "DST-PORT", "SRC-PORT":
			if isIP {
				continue
			}
		case "GEOIP":
			if isIP {
				return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("GeoIP rule for %s (requires runtime GeoIP database to verify)", ruleValue)}, nil
			}
		case "GEOSITE":
			if isDomain {
				return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("GeoSite rule for %s (requires runtime GeoSite database to verify)", ruleValue)}, nil
			}
		case "RULE-SET":
			return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: fmt.Sprintf("Rule-set %s (requires runtime rule-set data to verify)", ruleValue)}, nil
		case "MATCH":
			return &RuleMatchResult{Matched: true, RuleText: r.RuleText, RuleType: ruleType, Group: group, Reason: "MATCH rule catches all remaining traffic"}, nil
		}
	}

	return &RuleMatchResult{Matched: false, Reason: "No rule matched the input"}, nil
}
