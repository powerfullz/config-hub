package seed

import (
	"encoding/json"

	"config-hub/model"
)

// DefaultProxyGroups builds the full ordered list of proxy groups for the
// default profile (groupType=1 url-test, landing=false, regexFilter="all").
//
// The returned slice mirrors the output of buildProxyGroups in the TypeScript
// override-rules, with sort orders assigned sequentially from 1.
func DefaultProxyGroups(profileID uint) []model.ProxyGroup {
	// Build country group names for use in Auto and Fallback proxy lists.
	countryNames := make([]string, len(CountriesMeta))
	for i, c := range CountriesMeta {
		countryNames[i] = c.Name + "节点"
	}

	// Auto and Fallback reference all country groups.
	autoProxies := marshalProxies(countryNames...)

	// Standard service proxy list: [选择代理, 手动选择, DIRECT]
	svcProxies := marshalProxies(PGSelect, PGManual, "DIRECT")

	// Direct-first proxy list: [DIRECT, 选择代理, 手动选择]
	directFirstProxies := marshalProxies("DIRECT", PGSelect, PGManual)

	// Select proxy list for 选择代理: [自动选择, 故障转移, 手动选择]
	selectProxies := marshalProxies(PGAuto, PGFallback, PGManual)

	// 广告拦截: [REJECT, REJECT-DROP, DIRECT]
	adblockProxies := marshalProxies("REJECT", "REJECT-DROP", "DIRECT")

	// Final: [选择代理, DIRECT]
	finalProxies := marshalProxies(PGSelect, "DIRECT")

	// 搜狗输入法: [DIRECT, REJECT]
	sogouProxies := marshalProxies("DIRECT", "REJECT")

	// 手动选择: include-all, no explicit proxies
	manualProxies := marshalProxies()

	urlTestURL := "https://cp.cloudflare.com/generate_204"

	order := 0
	next := func() int { order++; return order }

	groups := []model.ProxyGroup{
		// 1. 选择代理
		{ProfileID: profileID, Name: PGSelect, Type: "select", SortOrder: next(), Proxies: selectProxies},
		// 2. 手动选择
		{ProfileID: profileID, Name: PGManual, Type: "select", SortOrder: next(), Proxies: manualProxies, IncludeAll: true},
		// 3. 静态资源
		{ProfileID: profileID, Name: PGStaticResources, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 4. AI服务
		{ProfileID: profileID, Name: PGAIService, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 5. 加密货币
		{ProfileID: profileID, Name: PGCrypto, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 6. 苹果服务
		{ProfileID: profileID, Name: PGApple, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 7. 谷歌服务
		{ProfileID: profileID, Name: PGGoogle, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 8. 微软服务
		{ProfileID: profileID, Name: PGMicrosoft, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 9. Xbox
		{ProfileID: profileID, Name: PGXbox, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 10. Github
		{ProfileID: profileID, Name: PGGithub, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 11. 哔哩哔哩
		{ProfileID: profileID, Name: PGBilibili, Type: "select", SortOrder: next(), Proxies: directFirstProxies},
		// 12. 巴哈姆特
		{ProfileID: profileID, Name: PGBahamut, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 13. Youtube
		{ProfileID: profileID, Name: PGYoutube, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 14. Twitch
		{ProfileID: profileID, Name: PGTwitch, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 15. Netflix
		{ProfileID: profileID, Name: PGNetflix, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 16. TikTok
		{ProfileID: profileID, Name: PGTikTok, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 17. Spotify
		{ProfileID: profileID, Name: PGSpotify, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 18. Telegram
		{ProfileID: profileID, Name: PGTelegram, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 19. Twitter
		{ProfileID: profileID, Name: PGTwitter, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 20. 新浪微博
		{ProfileID: profileID, Name: PGWeibo, Type: "select", SortOrder: next(), Proxies: directFirstProxies, IncludeAll: true},
		// 21. Truth Social
		{ProfileID: profileID, Name: PGTruthSocial, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 22. E-Hentai
		{ProfileID: profileID, Name: PGEHentai, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 23. PikPak网盘
		{ProfileID: profileID, Name: PGPikPak, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 24. 搜狗输入法
		{ProfileID: profileID, Name: PGSogouInput, Type: "select", SortOrder: next(), Proxies: sogouProxies},
		// 25. SSH
		{ProfileID: profileID, Name: PGSSH, Type: "select", SortOrder: next(), Proxies: svcProxies},
		// 26. Final
		{ProfileID: profileID, Name: PGFinal, Type: "select", SortOrder: next(), Proxies: finalProxies},
		// 27. 自动选择
		{ProfileID: profileID, Name: PGAuto, Type: "url-test", SortOrder: next(), Proxies: autoProxies, URL: urlTestURL, Interval: 60, Tolerance: 20},
		// 28. 故障转移
		{ProfileID: profileID, Name: PGFallback, Type: "fallback", SortOrder: next(), Proxies: autoProxies, URL: urlTestURL, Interval: 60, Tolerance: 20},
		// 29. 广告拦截
		{ProfileID: profileID, Name: PGAdBlock, Type: "select", SortOrder: next(), Proxies: adblockProxies},
		// 30. 低倍率节点
		{ProfileID: profileID, Name: PGLowCost, Type: "url-test", SortOrder: next(), Proxies: marshalProxies(), IncludeAll: true, Filter: LowCostNodePattern, URL: urlTestURL, Interval: 60, Tolerance: 20},
	}

	// 31-52. Country groups (appended last, matching TypeScript behavior).
	// Each country gets a url-test group with include-all + filter.
	for _, c := range CountriesMeta {
		groups = append(groups, model.ProxyGroup{
			ProfileID:  profileID,
			Name:       c.Name + "节点",
			Type:       "url-test",
			SortOrder:  next(),
			Proxies:    marshalProxies(),
			Icon:       c.Icon,
			IncludeAll: true,
			Filter:     c.Pattern,
			URL:        urlTestURL,
			Interval:   60,
			Tolerance:  20,
		})
	}

	return groups
}

// marshalProxies marshals a string slice into a JSON string array.
// An empty result produces "[]".
func marshalProxies(proxies ...string) string {
	if len(proxies) == 0 {
		return "[]"
	}
	data, err := json.Marshal(proxies)
	if err != nil {
		return "[]"
	}
	return string(data)
}
