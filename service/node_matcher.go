package service

import (
	"regexp"
	"sync"

	"config-hub/seed"
)

var (
	lowCostRegex   *regexp.Regexp
	landingRegex   *regexp.Regexp
	countryRegexes []countryRegexEntry
	compileOnce    sync.Once
)

type countryRegexEntry struct {
	name  string
	regex *regexp.Regexp
}

// compileMatchers compiles all regex patterns once (thread-safe).
func compileMatchers() {
	compileOnce.Do(func() {
		lowCostRegex = regexp.MustCompile(seed.LowCostNodePattern)
		landingRegex = regexp.MustCompile(seed.LandingNodePattern)

		for _, c := range seed.CountriesMeta {
			if c.Pattern == "" {
				continue
			}
			countryRegexes = append(countryRegexes, countryRegexEntry{
				name:  c.Name,
				regex: regexp.MustCompile(c.Pattern),
			})
		}
	})
}

// MatchCountry determines which country a node belongs to based on its name.
// Returns the country name, or empty string if no match.
func MatchCountry(nodeName string) string {
	compileMatchers()
	for _, entry := range countryRegexes {
		if entry.regex.MatchString(nodeName) {
			return entry.name
		}
	}
	return ""
}

// IsLandingNode checks if a node is a landing node (residential/business broadband, Starlink).
func IsLandingNode(nodeName string) bool {
	compileMatchers()
	return landingRegex.MatchString(nodeName)
}

// IsLowCostNode checks if a node is a low-cost (low multiplier) node.
func IsLowCostNode(nodeName string) bool {
	compileMatchers()
	return lowCostRegex.MatchString(nodeName)
}

// ClassifyNode is a convenience function that classifies a single node.
func ClassifyNode(node map[string]any) (country string, isLanding, isLowCost bool) {
	name := ExtractNodeName(node)
	if name == "" {
		return "", false, false
	}
	return MatchCountry(name), IsLandingNode(name), IsLowCostNode(name)
}

// ClassificationResult holds the results of batch node classification.
type ClassificationResult struct {
	CountryNodes map[string][]string // country name -> node names
	LandingNodes []string            // node names matching landing pattern
	LowCostNodes []string            // node names matching low-cost pattern
	UnknownNodes []string            // nodes that don't match any country
}

// ClassifyNodes classifies a batch of nodes and groups them.
func ClassifyNodes(nodes []map[string]any) *ClassificationResult {
	result := &ClassificationResult{
		CountryNodes: make(map[string][]string),
	}

	for _, node := range nodes {
		name := ExtractNodeName(node)
		if name == "" {
			continue
		}

		country := MatchCountry(name)
		isLanding := IsLandingNode(name)
		isLowCost := IsLowCostNode(name)

		if country != "" {
			result.CountryNodes[country] = append(result.CountryNodes[country], name)
		} else {
			result.UnknownNodes = append(result.UnknownNodes, name)
		}

		if isLanding {
			result.LandingNodes = append(result.LandingNodes, name)
		}

		if isLowCost {
			result.LowCostNodes = append(result.LowCostNodes, name)
		}
	}

	return result
}

// GetCountryGroupNames returns country group names (e.g., "香港节点", "美国节点")
// sorted by weight, for use in proxy group selector lists.
func GetCountryGroupNames(countries []string) []string {
	compileMatchers()

	countrySet := make(map[string]bool, len(countries))
	for _, c := range countries {
		countrySet[c] = true
	}

	var names []string
	for _, meta := range seed.CountriesMeta {
		if countrySet[meta.Name] {
			names = append(names, meta.Name+seed.NodeSuffix)
		}
	}
	return names
}
