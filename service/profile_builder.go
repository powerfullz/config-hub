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
		Preload("Subscriptions").
		Preload("SubscriptionGroups.Subscriptions").
		Preload("Rules", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		First(&profile, profileID).Error; err != nil {
		return nil, fmt.Errorf("profile not found: %w", err)
	}

	// Collect subscription IDs from both direct subscriptions and subscription groups.
	subIDs := collectSubIDs(profile.Subscriptions, profile.SubscriptionGroups)
	if len(subIDs) == 0 {
		return nil, fmt.Errorf("profile has no subscriptions")
	}

	// Load and parse all nodes.
	var nodes []model.Node
	if err := db.DB.Where("subscription_id IN ?", subIDs).Find(&nodes).Error; err != nil {
		return nil, fmt.Errorf("failed to load nodes: %w", err)
	}

	var allNodes []map[string]any
	allNodeNames := make([]string, 0, len(nodes))
	for _, n := range nodes {
		var nodeMap map[string]any
		if err := json.Unmarshal([]byte(n.RawConfig), &nodeMap); err != nil {
			continue
		}
		allNodes = append(allNodes, nodeMap)
		name := ExtractNodeName(nodeMap)
		if name != "" {
			allNodeNames = append(allNodeNames, name)
		}
	}

	// Classify nodes.
	classification := ClassifyNodes(allNodes)

	// Filter countries by threshold and sort by weight.
	countries := getSortedFilteredCountries(classification.CountryNodes, profile.Threshold)

	// Compute country group names (e.g., "香港节点").
	countryGroupNames := GetCountryGroupNames(countries)

	// Compute non-landing node names for front proxy selector (non-regex mode).
	landingSet := make(map[string]bool, len(classification.LandingNodes))
	for _, name := range classification.LandingNodes {
		landingSet[name] = true
	}
	var nonLandingNodes []string
	for _, name := range allNodeNames {
		if !landingSet[name] {
			nonLandingNodes = append(nonLandingNodes, name)
		}
	}

	template := &ConfigTemplate{
		Port:           7890,
		SocksPort:      7891,
		Mode:           "rule",
		LogLevel:       "info",
		GeodataMode:    true,
		GeoxUrl: map[string]string{
			"geoip":   seed.DefaultGeodata["geoip"].(string),
			"geosite": seed.DefaultGeodata["geosite"].(string),
		},
		RuleProviders: buildRuleProviders(),
		Proxies:       allNodes,
		Rules:         buildRuleStrings(profile),
		DNS:           buildDNSConfig(profile),
		Sniffer:       seed.DefaultSniffer,
	}

	// Full-mode configuration.
	if profile.Full {
		template.MixedPort = 7890
		template.RedirPort = 7892
		template.TProxyPort = 7893
		template.RoutingMark = 7894
		template.AllowLan = true
		template.BindAddress = "*"
		template.IPv6 = profile.IPv6
		template.UnifiedDelay = true
		template.TCPConcurrent = true
		template.FindProcessMode = "off"
		template.GeodataLoader = "standard"
		template.ExternalController = ":9999"
		template.DisableKeepAlive = !profile.KeepAlive
		template.Profile = map[string]any{"store-selected": true}
	}

	if profile.TUN {
		template.Tun = seed.DefaultTUN
	}

	template.ProxyGroups = buildProxyGroups(countries, classification, countryGroupNames, nonLandingNodes, profile)

	return template, nil
}

// collectSubIDs gathers unique subscription IDs from direct associations and
// from subscription groups' member subscriptions.
func collectSubIDs(subs []model.Subscription, groups []model.SubscriptionGroup) []uint {
	seen := make(map[uint]bool)
	var ids []uint

	for _, s := range subs {
		if !seen[s.ID] {
			seen[s.ID] = true
			ids = append(ids, s.ID)
		}
	}
	for _, g := range groups {
		for _, s := range g.Subscriptions {
			if !seen[s.ID] {
				seen[s.ID] = true
				ids = append(ids, s.ID)
			}
		}
	}

	return ids
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
	// Shallow copy to avoid mutating the shared default.
	src := seed.DefaultDNS
	dns := make(map[string]any, len(src))
	for k, v := range src {
		dns[k] = v
	}
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

// getSortedFilteredCountries filters out countries with fewer nodes than the
// threshold, then sorts remaining countries by weight (lowest first).
func getSortedFilteredCountries(countryNodes map[string][]string, threshold int) []string {
	type countryWeight struct {
		name   string
		weight int
	}

	weightMap := make(map[string]int)
	for _, c := range seed.CountriesMeta {
		weightMap[c.Name] = c.Weight
	}

	var entries []countryWeight
	for country, nodes := range countryNodes {
		if threshold > 0 && len(nodes) < threshold {
			continue
		}
		w, ok := weightMap[country]
		if !ok {
			w = 9999
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

// buildProxyGroups generates the full ordered list of proxy groups matching
// the override-rules TypeScript proxy_groups.ts output exactly.
func buildProxyGroups(
	countries []string,
	classification *ClassificationResult,
	countryGroupNames []string,
	nonLandingNodes []string,
	profile model.Profile,
) []map[string]any {
	landing := profile.Landing
	regexMode := profile.Regex
	gt := profile.GroupType
	hasLowCost := len(classification.LowCostNodes) > 0 || regexMode

	// Compute selector lists (matching override-rules/src/selectors.ts).
	lists := buildSelectorLists(landing, hasLowCost, regexMode, countryGroupNames, nonLandingNodes)

	hasTW := containsStr(countries, "台湾")
	hasHK := containsStr(countries, "香港")
	hasUS := containsStr(countries, "美国")

	// Build country proxy groups (matching override-rules buildCountryProxyGroups).
	countryGroups := buildCountryGroups(countries, classification, landing, regexMode, gt)

	// Build the full ordered group list matching TS proxy_groups.ts.
	groups := make([]map[string]any, 0, 34+len(countryGroups))

	// 1. 选择代理
	groups = append(groups, pg(seed.PGSelect, "select", lists.defaultSelector))

	// 2. 手动选择
	groups = append(groups, pgIncludeAll(seed.PGManual, "select"))

	// 3. 前置代理 (conditional on landing)
	if landing {
		fps := map[string]any{
			"name": seed.PGFrontProxy,
			"type": "select",
		}
		if regexMode {
			fps["include-all"] = true
			fps["exclude-filter"] = seed.LandingNodePattern
		}
		fps["proxies"] = lists.frontProxySelector
		groups = append(groups, fps)
	}

	// 4. 落地节点 (conditional on landing)
	if landing {
		ln := map[string]any{
			"name": seed.PGLanding,
			"type": "select",
		}
		if regexMode {
			ln["include-all"] = true
			ln["filter"] = seed.LandingNodePattern
		} else {
			ln["proxies"] = classification.LandingNodes
		}
		groups = append(groups, ln)
	}

	// 5. 静态资源
	groups = append(groups, pg(seed.PGStaticResources, "select", lists.defaultProxies))
	// 6. AI服务
	groups = append(groups, pg(seed.PGAIService, "select", lists.defaultProxies))
	// 7. 加密货币
	groups = append(groups, pg(seed.PGCrypto, "select", lists.defaultProxies))
	// 8. 苹果服务
	groups = append(groups, pg(seed.PGApple, "select", lists.defaultProxies))
	// 9. 谷歌服务
	groups = append(groups, pg(seed.PGGoogle, "select", lists.defaultProxies))
	// 10. 微软服务
	groups = append(groups, pg(seed.PGMicrosoft, "select", lists.defaultProxies))
	// 11. Xbox
	groups = append(groups, pg(seed.PGXbox, "select", lists.defaultProxies))
	// 12. Github
	groups = append(groups, pg(seed.PGGithub, "select", lists.defaultProxies))

	// 13. 哔哩哔哩 (conditional: TW+HK present → direct+local, else defaultProxiesDirect)
	if hasTW && hasHK {
		groups = append(groups, pg(seed.PGBilibili, "select", []string{"DIRECT", "台湾节点", "香港节点"}))
	} else {
		groups = append(groups, pg(seed.PGBilibili, "select", lists.defaultProxiesDirect))
	}

	// 14. 巴哈姆特 (conditional: TW present → local first, else defaultProxies)
	if hasTW {
		groups = append(groups, pg(seed.PGBahamut, "select", []string{"台湾节点", seed.PGSelect, seed.PGManual, "DIRECT"}))
	} else {
		groups = append(groups, pg(seed.PGBahamut, "select", lists.defaultProxies))
	}

	// 15. Youtube
	groups = append(groups, pg(seed.PGYoutube, "select", lists.defaultProxies))
	// 16. Twitch
	groups = append(groups, pg(seed.PGTwitch, "select", lists.defaultProxies))
	// 17. Netflix
	groups = append(groups, pg(seed.PGNetflix, "select", lists.defaultProxies))
	// 18. TikTok
	groups = append(groups, pg(seed.PGTikTok, "select", lists.defaultProxies))
	// 19. Spotify
	groups = append(groups, pg(seed.PGSpotify, "select", lists.defaultProxies))
	// 20. Telegram
	groups = append(groups, pg(seed.PGTelegram, "select", lists.defaultProxies))
	// 21. Twitter
	groups = append(groups, pg(seed.PGTwitter, "select", lists.defaultProxies))

	// 22. 新浪微博 (include-all + direct-first proxy list)
	wb := pgIncludeAll(seed.PGWeibo, "select")
	wb["proxies"] = lists.defaultProxiesDirect
	groups = append(groups, wb)

	// 23. Truth Social (conditional: US present → local first, else defaultProxies)
	if hasUS {
		groups = append(groups, pg(seed.PGTruthSocial, "select", []string{"美国节点", seed.PGSelect, seed.PGManual}))
	} else {
		groups = append(groups, pg(seed.PGTruthSocial, "select", lists.defaultProxies))
	}

	// 24. E-Hentai
	groups = append(groups, pg(seed.PGEHentai, "select", lists.defaultProxies))
	// 25. PikPak网盘
	groups = append(groups, pg(seed.PGPikPak, "select", lists.defaultProxies))
	// 26. 搜狗输入法
	groups = append(groups, pg(seed.PGSogouInput, "select", []string{"DIRECT", "REJECT"}))
	// 27. SSH
	groups = append(groups, pg(seed.PGSSH, "select", lists.defaultProxies))

	// 28. Final
	groups = append(groups, pg(seed.PGFinal, "select", []string{seed.PGSelect, "DIRECT"}))

	// 29. 自动选择 (url-test with defaultFallback)
	auto := pg(seed.PGAuto, "url-test", lists.defaultFallback)
	groups = append(groups, auto)

	// 30. 故障转移 (fallback with defaultFallback)
	fallback := map[string]any{
		"name":      seed.PGFallback,
		"type":      "fallback",
		"url":       "https://cp.cloudflare.com/generate_204",
		"interval":  60,
		"tolerance": 20,
		"proxies":   lists.defaultFallback,
	}
	groups = append(groups, fallback)

	// 31. 广告拦截
	groups = append(groups, pg(seed.PGAdBlock, "select", []string{"REJECT", "REJECT-DROP", "DIRECT"}))

	// 32. 低倍率节点 (conditional)
	if hasLowCost {
		typeStr := getTypeString(gt)
		lc := map[string]any{
			"name": seed.PGLowCost,
			"type": typeStr,
		}
		if regexMode {
			lc["include-all"] = true
			lc["filter"] = seed.LowCostNodePattern
		} else {
			lc["proxies"] = classification.LowCostNodes
		}
		addHealthCheck(lc, typeStr)
		if gt == 2 {
			lc["strategy"] = "sticky-sessions"
		}
		groups = append(groups, lc)
	}

	// 33+. Country groups (dynamically generated, matching TS order).
	groups = append(groups, countryGroups...)

	return groups
}

// buildSelectorLists computes all the proxy selector lists used by the proxy
// groups, matching override-rules/src/selectors.ts exactly.
func buildSelectorLists(
	landing bool,
	hasLowCost bool,
	regexMode bool,
	countryGroupNames []string,
	nonLandingNodes []string,
) selectorLists {
	var landingPart []string
	if landing {
		landingPart = []string{seed.PGLanding}
	}
	var lowCostPart []string
	if hasLowCost {
		lowCostPart = []string{seed.PGLowCost}
	}
	var nonLandingPart []string
	if !regexMode {
		nonLandingPart = nonLandingNodes
	}

	return selectorLists{
		defaultSelector: buildList(
			seed.PGAuto,
			seed.PGFallback,
			landingPart,
			countryGroupNames,
			lowCostPart,
			seed.PGManual,
			"DIRECT",
		),
		defaultProxies: buildList(
			seed.PGSelect,
			landingPart,
			countryGroupNames,
			lowCostPart,
			seed.PGManual,
			"DIRECT",
		),
		defaultProxiesDirect: buildList(
			"DIRECT",
			landingPart,
			countryGroupNames,
			lowCostPart,
			seed.PGSelect,
			seed.PGManual,
		),
		defaultFallback: buildList(
			landingPart,
			countryGroupNames,
		),
		frontProxySelector: buildList(
			countryGroupNames,
			"DIRECT",
			nonLandingPart,
		),
	}
}

type selectorLists struct {
	defaultSelector     []string
	defaultProxies      []string
	defaultProxiesDirect []string
	defaultFallback     []string
	frontProxySelector  []string
}

// buildCountryGroups generates one proxy group per country, matching
// override-rules buildCountryProxyGroups in proxy_groups.ts.
func buildCountryGroups(
	countries []string,
	classification *ClassificationResult,
	landing bool,
	regexMode bool,
	gt int,
) []map[string]any {
	typeStr := getTypeString(gt)
	groups := make([]map[string]any, 0, len(countries))

	// Only used in non-regex mode: direct node name lookup.
	nodesByCountry := classification.CountryNodes

	for _, country := range countries {
		meta := getCountryMeta(country)
		if meta == nil {
			continue
		}

		name := country + seed.NodeSuffix
		g := map[string]any{
			"name": name,
			"type": typeStr,
		}

		if !regexMode {
			// Enumerate actual node names.
			proxies := nodesByCountry[country]
			if proxies == nil {
				proxies = []string{}
			}
			g["proxies"] = proxies
		} else {
			// Use include-all + filter pattern.
			g["include-all"] = true
			g["filter"] = meta.Pattern
			if landing {
				g["exclude-filter"] = seed.LandingNodePattern
			}
		}

		if meta.Icon != "" {
			g["icon"] = meta.Icon
		}

		addHealthCheck(g, typeStr)
		if gt == 2 {
			g["strategy"] = "sticky-sessions"
		}

		groups = append(groups, g)
	}

	return groups
}

// ---------- Generic helpers ----------

// getTypeString converts a groupType int to the mihomo type string.
func getTypeString(gt int) string {
	switch gt {
	case 0:
		return "select"
	case 1:
		return "url-test"
	case 2:
		return "load-balance"
	default:
		return "select"
	}
}

// pg creates a simple proxy group with a "proxies" list.
func pg(name, typ string, proxies []string) map[string]any {
	m := map[string]any{"name": name, "type": typ, "proxies": proxies}
	addHealthCheck(m, typ)
	if typ == "load-balance" {
		m["strategy"] = "sticky-sessions"
	}
	return m
}

// pgIncludeAll creates a select group with include-all (for 手动选择 etc.).
func pgIncludeAll(name, typ string) map[string]any {
	return map[string]any{"name": name, "type": typ, "include-all": true}
}

// buildList filters out nil/empty/false values and flattens slices, matching
// the override-rules buildList utility.
func buildList(items ...any) []string {
	var result []string
	for _, item := range items {
		switch v := item.(type) {
		case string:
			if v != "" {
				result = append(result, v)
			}
		case []string:
			result = append(result, v...)
		case bool:
			// Booleans are conditions — skip them.
		}
	}
	return result
}

// addHealthCheck adds url/interval/tolerance for url-test and load-balance groups.
func addHealthCheck(m map[string]any, typ string) {
	if typ == "url-test" || typ == "load-balance" {
		m["url"] = "https://cp.cloudflare.com/generate_204"
		m["interval"] = 60
		m["tolerance"] = 20
	}
}

// getCountryMeta looks up a country's metadata from seed.CountriesMeta.
func getCountryMeta(country string) *seed.CountryMeta {
	for i := range seed.CountriesMeta {
		if seed.CountriesMeta[i].Name == country {
			return &seed.CountriesMeta[i]
		}
	}
	return nil
}

// containsStr checks if a string slice contains a value.
func containsStr(slice []string, value string) bool {
	for _, s := range slice {
		if s == value {
			return true
		}
	}
	return false
}
