package service

import "gopkg.in/yaml.v3"

// ConfigTemplate is the structure serialized to mihomo-compatible YAML.
// Field order determines YAML key order. Full-mode fields have omitempty.
type ConfigTemplate struct {
	// Base fields (always present)
	Port          int              `yaml:"port"`
	SocksPort     int              `yaml:"socks-port"`
	Mode          string           `yaml:"mode"`
	LogLevel      string           `yaml:"log-level"`
	GeodataMode   bool             `yaml:"geodata-mode"`
	GeoxUrl       map[string]string `yaml:"geox-url"`
	RuleProviders map[string]any   `yaml:"rule-providers"`
	Proxies       []map[string]any `yaml:"proxies"`
	ProxyGroups   []map[string]any `yaml:"proxy-groups"`
	Rules         []string         `yaml:"rules"`
	DNS           any              `yaml:"dns"`
	Sniffer       any              `yaml:"sniffer"`

	// Full-mode fields (only emitted when Full=true)
	MixedPort          int    `yaml:"mixed-port,omitempty"`
	RedirPort          int    `yaml:"redir-port,omitempty"`
	TProxyPort         int    `yaml:"tproxy-port,omitempty"`
	RoutingMark        int    `yaml:"routing-mark,omitempty"`
	AllowLan           bool   `yaml:"allow-lan,omitempty"`
	BindAddress        string `yaml:"bind-address,omitempty"`
	IPv6               bool   `yaml:"ipv6,omitempty"`
	UnifiedDelay       bool   `yaml:"unified-delay,omitempty"`
	TCPConcurrent      bool   `yaml:"tcp-concurrent,omitempty"`
	FindProcessMode    string `yaml:"find-process-mode,omitempty"`
	GeodataLoader      string `yaml:"geodata-loader,omitempty"`
	ExternalController string `yaml:"external-controller,omitempty"`
	DisableKeepAlive   bool   `yaml:"disable-keep-alive,omitempty"`
	Tun                any    `yaml:"tun,omitempty"`
	Profile            any    `yaml:"profile,omitempty"`
}

// Render serializes the config to YAML (uses default 2-space indent from yaml.v3).
func (c *ConfigTemplate) Render() ([]byte, error) {
	data, err := yaml.Marshal(c)
	if err != nil {
		return nil, err
	}
	return data, nil
}
