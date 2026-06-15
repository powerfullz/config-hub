package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"config-hub/internal/convert"
	"gopkg.in/yaml.v3"
)

// tryParseYAMLProxies attempts to parse body as a mihomo YAML config
// and extract nodes from the `proxies` field.
// Returns (nodes, true) on success, (nil, false) if the body is not valid YAML or has no proxies.
func tryParseYAMLProxies(body []byte) ([]map[string]any, bool) {
	var doc struct {
		Proxies []map[string]any `yaml:"proxies"`
	}
	if err := yaml.Unmarshal(body, &doc); err != nil {
		return nil, false
	}
	if len(doc.Proxies) == 0 {
		return nil, false
	}
	return doc.Proxies, true
}

// FetchResult holds the parsed subscription result.
type FetchResult struct {
	Nodes       []map[string]any
	TrafficInfo string // raw Subscription-Userinfo header value
	Upload      int64
	Download    int64
	Total       int64
	Expire      int64
}

// FetchSubscription fetches and parses a subscription URL.
// It retries up to 3 times with exponential backoff.
func FetchSubscription(rawURL, ua, proxy string) (*FetchResult, error) {
	if ua == "" {
		ua = "clash.meta/v1.19.24"
	}

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(1<<uint(attempt-1)) * time.Second)
		}

		result, err := fetchOnce(rawURL, ua, proxy)
		if err == nil {
			return result, nil
		}
		lastErr = err

		if isNonRetryable(err) {
			break
		}
	}
	return nil, fmt.Errorf("fetch subscription failed after retries: %w", lastErr)
}

func isNonRetryable(err error) bool {
	if err == nil {
		return true
	}
	msg := err.Error()
	nonRetryable := []string{"invalid URL", "SSRF guard", "unsupported protocol scheme"}
	for _, s := range nonRetryable {
		if strings.Contains(msg, s) {
			return true
		}
	}
	return false
}

func fetchOnce(rawURL, ua, proxyURL string) (*FetchResult, error) {
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if ua != "" {
		req.Header.Set("User-Agent", ua)
	}

	var client *http.Client
	if proxyURL != "" {
		proxyURLParsed, err := url.Parse(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy URL: %w", err)
		}
		transport := &http.Transport{
			Proxy: http.ProxyURL(proxyURLParsed),
		}
		client = &http.Client{Transport: transport, Timeout: 30 * time.Second}
	} else {
		client = SafeHTTPClient()
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var nodes []map[string]any
	if yamlNodes, ok := tryParseYAMLProxies(body); ok {
		nodes = yamlNodes
	} else {
		var err error
		nodes, err = convert.ConvertsV2Ray(body)
		if err != nil {
			return nil, fmt.Errorf("parse subscription: %w", err)
		}
	}

	result := &FetchResult{Nodes: nodes}

	// Parse Subscription-Userinfo header (traffic info)
	if info := resp.Header.Get("Subscription-Userinfo"); info != "" {
		result.TrafficInfo = info
		for _, part := range strings.Split(info, ";") {
			part = strings.TrimSpace(part)
			if kv := strings.SplitN(part, "=", 2); len(kv) == 2 {
				key := strings.TrimSpace(kv[0])
				val := strings.TrimSpace(kv[1])
				var num int64
				fmt.Sscanf(val, "%d", &num)
				switch key {
				case "upload":
					result.Upload = num
				case "download":
					result.Download = num
				case "total":
					result.Total = num
				case "expire":
					result.Expire = num
				}
			}
		}
	}

	return result, nil
}

// SafeHTTPClient returns an HTTP client with SSRF protection.
// This will be replaced by ssrf_guard.go once it's implemented.
// For now, returns a default client with 30s timeout.
var SafeHTTPClient = func() *http.Client {
	return &http.Client{Timeout: 30 * time.Second}
}

// ExtractNodeName extracts the node name from a parsed proxy config.
func ExtractNodeName(node map[string]any) string {
	if name, ok := node["name"].(string); ok {
		return name
	}
	return ""
}

// ExtractNodeType extracts the protocol type from a parsed proxy config.
func ExtractNodeType(node map[string]any) string {
	if t, ok := node["type"].(string); ok {
		return t
	}
	return ""
}

// ExtractNodeServer extracts the server address from a parsed proxy config.
func ExtractNodeServer(node map[string]any) string {
	if s, ok := node["server"].(string); ok {
		return s
	}
	return ""
}

// ExtractNodePort extracts the port from a parsed proxy config.
func ExtractNodePort(node map[string]any) int {
	if p, ok := node["port"].(float64); ok {
		return int(p)
	}
	if p, ok := node["port"].(int); ok {
		return p
	}
	return 0
}

// NodeToJSON serializes a node map to JSON string for storage.
func NodeToJSON(node map[string]any) string {
	data, err := json.Marshal(node)
	if err != nil {
		return "{}"
	}
	return string(data)
}
