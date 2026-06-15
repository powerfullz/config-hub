package service

import "gopkg.in/yaml.v3"

// ConfigTemplate wraps everything needed for a mihomo-compatible YAML config.
// Field ordering in this struct determines the YAML key order (port first → tun last).
type ConfigTemplate struct {
	Port             int              `yaml:"port"`
	SocksPort        int              `yaml:"socks-port"`
	MixedPort        int              `yaml:"mixed-port"`
	RedirPort        int              `yaml:"redir-port"`
	TProxyPort       int              `yaml:"tproxy-port"`
	Mode             string           `yaml:"mode"`
	LogLevel         string           `yaml:"log-level"`
	AllowLan         bool             `yaml:"allow-lan"`
	BindAddress      string           `yaml:"bind-address"`
	IPv6             bool             `yaml:"ipv6"`
	UnifiedDelay     bool             `yaml:"unified-delay"`
	TCPConcurrent    bool             `yaml:"tcp-concurrent"`
	GeodataMode      bool             `yaml:"geodata-mode"`
	GeoxUrl          map[string]string `yaml:"geox-url"`
	DisableKeepAlive bool             `yaml:"disable-keep-alive"`
	ProxyProviders   map[string]any   `yaml:"proxy-providers,omitempty"`
	RuleProviders    map[string]any   `yaml:"rule-providers"`
	Proxies          []map[string]any `yaml:"proxies"`
	ProxyGroups      []map[string]any `yaml:"proxy-groups"`
	Rules            []string         `yaml:"rules"`
	DNS              any              `yaml:"dns"`
	Tun              any              `yaml:"tun,omitempty"`
	Sniffer          any              `yaml:"sniffer"`
	Profile          any              `yaml:"profile,omitempty"`
}

// Render marshals the config template to YAML bytes, suitable for
// writing directly to a mihomo-compatible config file.
func (c *ConfigTemplate) Render() ([]byte, error) {
	data, err := yaml.Marshal(c)
	if err != nil {
		return nil, err
	}
	return data, nil
}
