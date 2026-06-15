package service

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

// Private and special IP ranges to block.
var blockedCIDRs = []string{
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"127.0.0.0/8",
	"169.254.0.0/16", // link-local (includes AWS/GCP metadata endpoint 169.254.169.254)
	"0.0.0.0/8",
	"224.0.0.0/4",  // multicast
	"100.64.0.0/10",  // CGNAT
	"198.18.0.0/15",  // benchmark
	"fc00::/7",       // IPv6 ULA
	"fe80::/10",      // IPv6 link-local
	"::1/128",        // IPv6 loopback
}

var blockedNets []*net.IPNet

func init() {
	for _, cidr := range blockedCIDRs {
		_, n, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(fmt.Sprintf("invalid CIDR %q: %v", cidr, err))
		}
		blockedNets = append(blockedNets, n)
	}
}

// isBlockedIP checks if an IP address is in a blocked range.
func isBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	// Also block if IP is loopback after parsing as non-loopback
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, n := range blockedNets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// SafeDialer is a net.Dialer that blocks connections to private/special IPs.
type SafeDialer struct {
	inner *net.Dialer
}

func (d *SafeDialer) DialContext(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, fmt.Errorf("SSRF guard: invalid address %q: %w", address, err)
	}

	// Resolve domain to IPs first
	resolver := d.inner.Resolver
	if resolver == nil {
		resolver = net.DefaultResolver
	}
	ips, err := resolver.LookupIPAddr(ctx, host)
	if err != nil {
		// If resolution fails for a literal IP, try parsing directly
		if ip := net.ParseIP(host); ip != nil {
			if isBlockedIP(ip) {
				return nil, fmt.Errorf("SSRF guard: blocked IP %s", host)
			}
			return d.inner.DialContext(ctx, network, address)
		}
		return nil, err
	}

	// Check all resolved IPs
	for _, ipAddr := range ips {
		if isBlockedIP(ipAddr.IP) {
			return nil, fmt.Errorf("SSRF guard: blocked DNS resolution %s -> %s (port %s)", host, ipAddr.IP, port)
		}
	}

	// Proceed with connection
	conn, err := d.inner.DialContext(ctx, network, address)
	if err != nil {
		return nil, err
	}

	// Double-check the actual connected address
	if tcpAddr, ok := conn.RemoteAddr().(*net.TCPAddr); ok {
		if isBlockedIP(tcpAddr.IP) {
			conn.Close()
			return nil, fmt.Errorf("SSRF guard: blocked connection to %s (port %s)", tcpAddr.IP, port)
		}
	}

	return conn, nil
}

var safeHTTPClientOnce sync.Once
var safeHTTPClient *http.Client

// initSafeClient initializes the SSRF-safe HTTP client.
func initSafeClient() {
	transport := &http.Transport{
		DialContext: (&SafeDialer{
			inner: &net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
			},
		}).DialContext,
		MaxIdleConns:          10,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
	}

	safeHTTPClient = &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			// Verify redirect target is safe
			host := req.URL.Hostname()
			if ip := net.ParseIP(host); ip != nil && isBlockedIP(ip) {
				return fmt.Errorf("SSRF guard: redirect to blocked IP %s", host)
			}
			return nil
		},
	}
}

// InitSafeHTTPClient replaces the default SafeHTTPClient with the SSRF-protected version.
// Must be called during server startup (before any subscription fetches).
func InitSafeHTTPClient() {
	SafeHTTPClient = func() *http.Client {
		safeHTTPClientOnce.Do(initSafeClient)
		return safeHTTPClient
	}
}
