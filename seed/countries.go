package seed

// CountryMeta holds metadata for a country/region used in proxy group matching.
type CountryMeta struct {
	Name    string // Display name in Chinese
	Weight  int    // Sort weight; 0 means no explicit weight (sorts last)
	Pattern string // Go regex pattern for matching node names
	Icon    string // CDN URL for the country flag icon
}

// CountriesMeta is the ordered list of 22 countries/regions, ported from
// override-rules TypeScript constants.
var CountriesMeta = []CountryMeta{
	{
		Name:    "香港",
		Weight:  10,
		Pattern: `(?i)香港|港|\b(?:HK|hk)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|\x{1F1ED}\x{1F1F0}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",
	},
	{
		Name:    "澳门",
		Pattern: `(?i)澳门|\b(?:MO|mo)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Macau|\x{1F1F2}\x{1F1F4}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Macao.png",
	},
	{
		Name:    "台湾",
		Weight:  20,
		Pattern: `(?i)台|新北|彰化|\b(?:TW|tw)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Taiwan|TAIWAN|TWN|TPE|ROC|\x{1F1F9}\x{1F1FC}|\x{1F1FC}\x{1F1F8}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
	},
	{
		Name:    "新加坡",
		Weight:  30,
		Pattern: `(?i)新加坡|坡|狮城|\b(?:SG|sg)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Singapore|SINGAPORE|SIN|\x{1F1F8}\x{1F1EC}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
	},
	{
		Name:    "日本",
		Weight:  40,
		Pattern: `(?i)日本|川日|东京|大阪|泉日|埼玉|沪日|深日|\b(?:JP|jp)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|\x{1F1EF}\x{1F1F5}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
	},
	{
		Name:    "韩国",
		Weight:  45,
		Pattern: `(?i)韩国|韩|韓|春川|Chuncheon|首尔|\b(?:KR|kr)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Korea|KOREA|KOR|ICN|\x{1F1F0}\x{1F1F7}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
	},
	{
		Name:    "美国",
		Weight:  50,
		Pattern: `(?i)美国|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|亚特兰大|迈阿密|华盛顿|\b(?:US|us)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|\x{1F1FA}\x{1F1F8}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
	},
	{
		Name:    "加拿大",
		Weight:  55,
		Pattern: `(?i)加拿大|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|\b(?:CA|ca)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Canada|CANADA|CAN|YVR|YYZ|YUL|\x{1F1E8}\x{1F1E6}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Canada.png",
	},
	{
		Name:    "英国",
		Weight:  60,
		Pattern: `(?i)英国|伦敦|曼彻斯特|Manchester|\b(?:UK|uk)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Britain|United Kingdom|UNITED KINGDOM|England|GBR|LHR|MAN|\x{1F1EC}\x{1F1E7}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png",
	},
	{
		Name:    "澳大利亚",
		Pattern: `(?i)澳洲|澳大利亚|\b(?:AU|au)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Australia|\x{1F1E6}\x{1F1FA}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Australia.png",
	},
	{
		Name:    "德国",
		Weight:  70,
		Pattern: `(?i)德国|德|柏林|法兰克福|慕尼黑|Munich|\b(?:DE|de)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Germany|GERMANY|DEU|MUC|\x{1F1E9}\x{1F1EA}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Germany.png",
	},
	{
		Name:    "法国",
		Weight:  80,
		Pattern: `(?i)法国|法|巴黎|马赛|Marseille|\b(?:FR|fr)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|France|FRANCE|FRA|CDG|MRS|\x{1F1EB}\x{1F1F7}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/France.png",
	},
	{
		Name:    "俄罗斯",
		Pattern: `(?i)俄罗斯|俄|\b(?:RU|ru)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Russia|\x{1F1F7}\x{1F1FA}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Russia.png",
	},
	{
		Name:    "泰国",
		Pattern: `(?i)泰国|泰|\b(?:TH|th)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Thailand|\x{1F1F9}\x{1F1ED}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Thailand.png",
	},
	{
		Name:    "印度",
		Pattern: `(?i)印度|\b(?:IN|in)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|India|\x{1F1EE}\x{1F1F3}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/India.png",
	},
	{
		Name:    "马来西亚",
		Pattern: `(?i)马来西亚|马来|\b(?:MY|my)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Malaysia|\x{1F1F2}\x{1F1FE}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png",
	},
	{
		Name:    "阿根廷",
		Pattern: `(?i)阿根廷|布宜诺斯艾利斯|\b(?:AR|ar)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Argentina|EZE|\x{1F1E6}\x{1F1F7}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Argentina.png",
	},
	{
		Name:    "芬兰",
		Pattern: `(?i)芬兰|赫尔辛基|\b(?:FI|fi)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Finland|HEL|\x{1F1EB}\x{1F1EE}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Finland.png",
	},
	{
		Name:    "埃及",
		Pattern: `(?i)埃及|开罗|\b(?:EG|eg)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Egypt|CAI|\x{1F1EA}\x{1F1EC}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Egypt.png",
	},
	{
		Name:    "菲律宾",
		Pattern: `(?i)菲律宾|马尼拉|\b(?:PH|ph)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Philippines|MNL|\x{1F1F5}\x{1F1ED}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Philippines.png",
	},
	{
		Name:    "土耳其",
		Pattern: `(?i)土耳其|伊斯坦布尔|\b(?:TR|tr)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Turkey|Türkiye|IST|\x{1F1F9}\x{1F1F7}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Turkey.png",
	},
	{
		Name:    "乌克兰",
		Pattern: `(?i)乌克兰|基辅|\b(?:UA|ua)(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?\b|Ukraine|KBP|\x{1F1FA}\x{1F1E6}`,
		Icon:    "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Ukraine.png",
	},
}

// Proxy group name constants.
const (
	PGSelect          = "选择代理"
	PGManual          = "手动选择"
	PGLowCost         = "低倍率节点"
	PGLanding         = "落地节点"
	PGFrontProxy      = "前置代理"
	PGStaticResources = "静态资源"
	PGAIService       = "AI服务"
	PGCrypto          = "加密货币"
	PGApple           = "苹果服务"
	PGGoogle          = "谷歌服务"
	PGMicrosoft       = "微软服务"
	PGBilibili        = "哔哩哔哩"
	PGBahamut         = "巴哈姆特"
	PGXbox            = "Xbox"
	PGGithub          = "Github"
	PGYoutube         = "Youtube"
	PGNetflix         = "Netflix"
	PGTikTok          = "TikTok"
	PGSpotify         = "Spotify"
	PGEHentai         = "E-Hentai"
	PGTelegram        = "Telegram"
	PGTruthSocial     = "Truth Social"
	PGTwitter         = "Twitter"
	PGTwitch          = "Twitch"
	PGWeibo           = "新浪微博"
	PGPikPak          = "PikPak网盘"
	PGSSH             = "SSH"
	PGSogouInput      = "搜狗输入法"
	PGAdBlock         = "广告拦截"
	PGGLOBAL          = "GLOBAL"
	PGFinal           = "Final"
	PGAuto            = "自动选择"
	PGFallback        = "故障转移"

	// General-purpose constants
	PGDirect   = "DIRECT"
	NodeSuffix = "节点"
)

// Node matching patterns.
const (
	LowCostNodePattern = `(?i)0\.[0-5]|低倍率|省流|实验性`
	LandingNodePattern = `(?i)家宽|家庭宽带|商宽|商业宽带|星链|Starlink|落地`
)
