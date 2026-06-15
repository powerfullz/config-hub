package seed

// DefaultDNS holds the default DNS configuration for a mihomo/clash profile.
var DefaultDNS = map[string]interface{}{
	"enable":                  true,
	"ipv6":                    false,
	"prefer-h3":               true,
	"enhanced-mode":           "redir-host",
	"default-nameserver":      []string{"119.29.29.29", "223.5.5.5"},
	"nameserver":              []string{"system", "223.5.5.5", "119.29.29.29", "180.184.1.1"},
	"fallback":                []string{"quic://dns0.eu", "https://dns.cloudflare.com/dns-query", "https://dns.sb/dns-query", "tcp://208.67.222.222", "tcp://8.26.56.2"},
	"proxy-server-nameserver": []string{"https://dns.alidns.com/dns-query", "tls://dot.pub"},
}

// DefaultSniffer holds the default sniffer configuration.
var DefaultSniffer = map[string]interface{}{
	"sniff": map[string]map[string][]int{
		"TLS":  {"ports": {443, 8443}},
		"HTTP": {"ports": {80, 8080, 8880}},
		"QUIC": {"ports": {443, 8443}},
	},
	"override-destination": false,
	"enable":               true,
	"force-dns-mapping":    true,
	"skip-domain":          []string{"Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"},
}

// DefaultTUN holds the default TUN configuration.
var DefaultTUN = map[string]interface{}{
	"enable":                false,
	"stack":                 "gvisor",
	"device":                "mihomo",
	"route-exclude-address": []string{"100.64.0.0/10", "fd7a:115c:a1e0::/48", "192.168.0.0/16", "fd00::/8"},
	"dns-hijack":            []string{"any:53"},
	"mtu":                   1500,
}

// DefaultGeodata holds the default geodata download URLs.
var DefaultGeodata = map[string]interface{}{
	"geoip":   "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
	"geosite": "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
}
