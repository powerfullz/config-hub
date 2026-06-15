package seed

// RuleProviderSeed holds a single rule-provider definition for seeding.
type RuleProviderSeed struct {
	Type     string `json:"type"`
	Behavior string `json:"behavior"`
	Format   string `json:"format"`
	Interval int    `json:"interval"`
	URL      string `json:"url"`
	Path     string `json:"path"`
}

// RuleProviders is the map of all 13 rule providers, ported from
// override-rules TypeScript rule_providers.
var RuleProviders = map[string]RuleProviderSeed{
	"ADBlock": {
		Type: "http", Behavior: "domain", Format: "yaml", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.yaml",
		Path: "./ruleset/ADBlock.yaml",
	},
	"SogouInput": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://ruleset.skk.moe/Clash/non_ip/sogouinput.txt",
		Path: "./ruleset/SogouInput.txt",
	},
	"StaticResources": {
		Type: "http", Behavior: "domain", Format: "text", Interval: 86400,
		URL:  "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
		Path: "./ruleset/StaticResources.txt",
	},
	"CDNResources": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
		Path: "./ruleset/CDNResources.txt",
	},
	"TikTok": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/TikTok.list",
		Path: "./ruleset/TikTok.list",
	},
	"EHentai": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/EHentai.list",
		Path: "./ruleset/EHentai.list",
	},
	"SteamFix": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/SteamFix.list",
		Path: "./ruleset/SteamFix.list",
	},
	"GoogleFCM": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list",
		Path: "./ruleset/FirebaseCloudMessaging.list",
	},
	"AdditionalFilter": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalFilter.list",
		Path: "./ruleset/AdditionalFilter.list",
	},
	"AdditionalCDNResources": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalCDNResources.list",
		Path: "./ruleset/AdditionalCDNResources.list",
	},
	"Crypto": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/Crypto.list",
		Path: "./ruleset/Crypto.list",
	},
	"Weibo": {
		Type: "http", Behavior: "classical", Format: "text", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/Weibo.list",
		Path: "./ruleset/Weibo.list",
	},
	"GFWList": {
		Type: "http", Behavior: "domain", Format: "yaml", Interval: 86400,
		URL:  "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
		Path: "./ruleset/GFWList.yaml",
	},
}
