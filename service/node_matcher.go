package service

import (
	"regexp"
	"sort"
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

	// Build weight lookup.
	weightMap := make(map[string]int, len(seed.CountriesMeta))
	for _, c := range seed.CountriesMeta {
		weightMap[c.Name] = c.Weight
	}

	// Sort input countries by weight (Weight: 0 sorts last).
	sorted := make([]string, len(countries))
	copy(sorted, countries)
	sort.Slice(sorted, func(i, j int) bool {
		wi := weightMap[sorted[i]]
		wj := weightMap[sorted[j]]
		if wi == 0 {
			wi = 9999
		}
		if wj == 0 {
			wj = 9999
		}
		if wi != wj {
			return wi < wj
		}
		return sorted[i] < sorted[j]
	})

	names := make([]string, len(sorted))
	for i, c := range sorted {
		names[i] = c + seed.NodeSuffix
	}
	return names
}
