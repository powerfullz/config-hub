package service

import (
	"encoding/json"
	"fmt"
	"sort"

	"config-hub/db"
	"config-hub/model"
	"config-hub/seed"

	"gorm.io/gorm"
)

// BuildConfig assembles a mihomo-compatible config from a profile and all
// its subscribed nodes. It returns a ConfigTemplate ready for YAML rendering.
func BuildConfig(profileID uint) (*ConfigTemplate, error) {
	var profile model.Profile
	if err := db.DB.
		Preload("ProxyGroups", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Preload("Rules", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Preload("Subscriptions").
		First(&profile, profileID).Error; err != nil {
		return nil, fmt.Errorf("profile not found: %w", err)
	}

	// Collect all nodes from the profile's subscribed subscriptions.
	var allNodes []map[string]any
	var subIDs []uint
	for _, sub := range profile.Subscriptions {
		subIDs = append(subIDs, sub.ID)
	}
	if len(subIDs) > 0 {
		var nodes []model.Node
		if err := db.DB.Where("subscription_id IN ?", subIDs).Find(&nodes).Error; err != nil {
			return nil, fmt.Errorf("failed to load nodes: %w", err)
		}
		for _, n := range nodes {
			var nodeMap map[string]any
			if err := json.Unmarshal([]byte(n.RawConfig), &nodeMap); err != nil {
				continue
			}
			allNodes = append(allNodes, nodeMap)
		}
	}

	// Classify nodes by country.
	classification := ClassifyNodes(allNodes)

	// Sort countries by weight (from CountriesMeta).
	countries := getSortedCountries(classification.CountryNodes)

	// Get country group names for selectors (e.g., "香港节点").
	countryGroupNames := GetCountryGroupNames(countries)

	template := &ConfigTemplate{
		Port:             7890,
		SocksPort:        7891,
		MixedPort:        7890,
		RedirPort:        7892,
		TProxyPort:       7893,
		Mode:             "rule",
		LogLevel:         "info",
		AllowLan:         false,
		BindAddress:      "*",
		IPv6:             profile.IPv6,
		UnifiedDelay:     false,
		TCPConcurrent:    true,
		GeodataMode:      true,
		GeoxUrl: map[string]string{
			"geoip":   seed.DefaultGeodata["geoip"].(string),
			"geosite": seed.DefaultGeodata["geosite"].(string),
		},
		DisableKeepAlive: !profile.KeepAlive,
		RuleProviders:    buildRuleProviders(),
		Proxies:          allNodes,
		Rules:            buildRuleStrings(profile),
		DNS:              buildDNSConfig(profile),
		Sniffer:          seed.DefaultSniffer,
	}

	if profile.TUN {
		template.Tun = seed.DefaultTUN
	}

	template.ProxyGroups = buildProxyGroupsList(
		profile.ProxyGroups,
		profile,
		countries,
		countryGroupNames,
		classification,
		allNodes,
	)

	template.Profile = map[string]any{
		"store-selected": true,
		"store-fake-ip":  true,
	}

	return template, nil
}

// buildRuleStrings converts RuleEntry records to mihomo rule strings.
func buildRuleStrings(profile model.Profile) []string {
	rules := make([]string, 0, len(profile.Rules))
	for _, r := range profile.Rules {
		rules = append(rules, r.RuleText)
	}
	return rules
}

// buildRuleProviders converts seed rule providers to the mihomo format.
func buildRuleProviders() map[string]any {
	result := make(map[string]any, len(seed.RuleProviders))
	for name, rp := range seed.RuleProviders {
		result[name] = map[string]any{
			"type":     rp.Type,
			"behavior": rp.Behavior,
			"format":   rp.Format,
			"interval": rp.Interval,
			"url":      rp.URL,
			"path":     rp.Path,
		}
	}
	return result
}

// buildDNSConfig builds the DNS section based on profile flags.
func buildDNSConfig(profile model.Profile) map[string]any {
	dns := seed.DefaultDNS
	if profile.FakeIP {
		dns["enhanced-mode"] = "fake-ip"
		dns["fake-ip-filter"] = []string{
			"geosite:private",
			"geosite:connectivity-check",
			"Mijia Cloud",
			"dig.io.mi.com",
			"localhost.ptlogin2.qq.com",
			"*.icloud.com",
			"*.stun.*.*",
			"*.stun.*.*.*",
		}
	}
	return dns
}

// getSortedCountries returns country names sorted by weight (lowest first).
// Countries without an explicit weight sort last, then alphabetically.
func getSortedCountries(countryNodes map[string][]string) []string {
	type countryWeight struct {
		name   string
		weight int
	}

	weightMap := make(map[string]int)
	for _, c := range seed.CountriesMeta {
		weightMap[c.Name] = c.Weight
	}

	entries := make([]countryWeight, 0, len(countryNodes))
	for country := range countryNodes {
		w, ok := weightMap[country]
		if !ok {
			w = 9999 // no explicit weight → sort last
		}
		entries = append(entries, countryWeight{name: country, weight: w})
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].weight != entries[j].weight {
			return entries[i].weight < entries[j].weight
		}
		return entries[i].name < entries[j].name
	})

	result := make([]string, len(entries))
	for i, e := range entries {
		result[i] = e.name
	}
	return result
}

// buildProxyGroupsList builds the full proxy groups array, including
// dynamically generated country groups resolved from DB entries.
func buildProxyGroupsList(
	dbGroups []model.ProxyGroup,
	profile model.Profile,
	countries []string,
	countryGroupNames []string,
	classification *ClassificationResult,
	allNodes []map[string]any,
) []map[string]any {
	proxyLookup := resolveProxyNames(countries, countryGroupNames, classification, allNodes, profile)

	groups := make([]map[string]any, 0, len(dbGroups))
	for _, pg := range dbGroups {
		groupMap := proxyGroupToMap(pg, proxyLookup)
		groups = append(groups, groupMap)
	}

	return groups
}

// proxyGroupToMap converts a model.ProxyGroup to a map for YAML serialization.
// Proxy references that appear in the lookup map are expanded.
func proxyGroupToMap(pg model.ProxyGroup, lookup map[string][]string) map[string]any {
	m := make(map[string]any)
	m["name"] = pg.Name
	m["type"] = pg.Type

	if pg.URL != "" {
		m["url"] = pg.URL
	}
	if pg.Interval > 0 {
		m["interval"] = pg.Interval
	}
	if pg.Tolerance > 0 {
		m["tolerance"] = pg.Tolerance
	}
	if pg.Strategy != "" {
		m["strategy"] = pg.Strategy
	}

	if pg.IncludeAll {
		m["include-all"] = true
		if pg.Filter != "" {
			m["filter"] = pg.Filter
		}
		if pg.ExcludeFilter != "" {
			m["exclude-filter"] = pg.ExcludeFilter
		}
	}

	// Parse and resolve proxy references.
	if pg.Proxies != "" {
		var proxyList []string
		_ = json.Unmarshal([]byte(pg.Proxies), &proxyList)

		// Resolve references: if a proxy name appears in lookup, expand it.
		resolved := make([]string, 0, len(proxyList))
		for _, p := range proxyList {
			if expanded, ok := lookup[p]; ok {
				resolved = append(resolved, expanded...)
			} else {
				resolved = append(resolved, p)
			}
		}
		m["proxies"] = resolved
	}

	if pg.Icon != "" && pg.Icon != "null" {
		m["icon"] = pg.Icon
	}

	return m
}

// resolveProxyNames builds a map from proxy group names to their expanded
// node lists. For example, "香港节点" maps to all Hong Kong node names.
// This is a forward-looking design — currently returns empty slices for
// country groups so that include-all + filter are used instead.
func resolveProxyNames(
	countries []string,
	countryGroupNames []string,
	_ *ClassificationResult,
	_ []map[string]any,
	_ model.Profile,
) map[string][]string {
	lookup := make(map[string][]string, len(countries))

	// Map country group names to empty slices.
	// An empty slice signals "use include-all + filter" downstream,
	// rather than listing every node name individually.
	for _, c := range countries {
		lookup[c+seed.NodeSuffix] = []string{}
	}

	return lookup
}
