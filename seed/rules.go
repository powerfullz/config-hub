package seed

import (
	"config-hub/model"
)

// DefaultRules returns all 37 base rules for the default profile, ported
// from override-rules TypeScript rules.ts (with quic=true, no QUIC block).
func DefaultRules(profileID uint) []model.RuleEntry {
	ruleTexts := []string{
		"DST-PORT,22,SSH",
		"GEOIP,private,DIRECT,no-resolve",
		"RULE-SET,ADBlock,广告拦截",
		"RULE-SET,AdditionalFilter,广告拦截",
		"RULE-SET,SogouInput,搜狗输入法",
		"DOMAIN-SUFFIX,truthsocial.com,Truth Social",
		"RULE-SET,StaticResources,静态资源",
		"RULE-SET,CDNResources,静态资源",
		"RULE-SET,AdditionalCDNResources,静态资源",
		"GEOSITE,category-ai-!cn,AI服务",
		"GEOSITE,bilibili,哔哩哔哩",
		"GEOSITE,youtube,Youtube",
		"GEOSITE,telegram,Telegram",
		"GEOIP,telegram,Telegram,no-resolve",
		"GEOSITE,xbox,Xbox",
		"GEOSITE,github,Github",
		"GEOSITE,netflix,Netflix",
		"GEOSITE,twitch,Twitch",
		"GEOIP,netflix,Netflix,no-resolve",
		"GEOSITE,spotify,Spotify",
		"GEOSITE,bahamut,巴哈姆特",
		"GEOSITE,pikpak,PikPak网盘",
		"GEOSITE,twitter,Twitter",
		"RULE-SET,Weibo,新浪微博",
		"RULE-SET,EHentai,E-Hentai",
		"RULE-SET,TikTok,TikTok",
		"RULE-SET,SteamFix,DIRECT",
		"RULE-SET,GoogleFCM,DIRECT",
		"GEOSITE,google-play@cn,DIRECT",
		"GEOSITE,microsoft@cn,DIRECT",
		"GEOSITE,apple,苹果服务",
		"GEOSITE,microsoft,微软服务",
		"GEOSITE,google,谷歌服务",
		"RULE-SET,Crypto,加密货币",
		"RULE-SET,GFWList,选择代理",
		"GEOIP,cn,DIRECT",
		"MATCH,Final",
	}

	rules := make([]model.RuleEntry, len(ruleTexts))
	for i, t := range ruleTexts {
		rules[i] = model.RuleEntry{
			ProfileID: profileID,
			RuleText:  t,
			SortOrder: i + 1,
		}
	}

	return rules
}
