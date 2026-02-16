package gateway

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
)

// Common spec paths to probe when no explicit spec is configured.
// Ordered by popularity: most common frameworks first.
var probePaths = []string{
	// OpenAPI 3.x standard
	"/openapi.json",
	"/openapi.yaml",
	"/openapi.yml",
	"/.well-known/openapi",
	"/.well-known/openapi.json",
	"/.well-known/openapi.yaml",

	// Swagger 2.x / SpringFox / SpringDoc
	"/swagger.json",
	"/swagger.yaml",
	"/swagger/doc.json",
	"/v3/api-docs",
	"/v3/api-docs.yaml",
	"/v2/api-docs",
	"/v2/api-docs.yaml",

	// Generic
	"/api-docs",
	"/api-docs.json",
	"/api-docs.yaml",
	"/docs/openapi.json",
	"/docs/openapi.yaml",
	"/docs/swagger.json",
	"/api/swagger.json",
	"/api/openapi.json",
	"/api/openapi.yaml",
	"/api/docs",
	"/api/schema",

	// FastAPI / Python
	"/openapi",
	"/docs/openapi",

	// .NET / NSwag
	"/swagger/v1/swagger.json",
	"/swagger/v2/swagger.json",

	// Rails / Rswag
	"/api-docs/v1/swagger.json",
	"/api-docs/v1/swagger.yaml",

	// Express / NestJS
	"/api/api-docs",
	"/api/v1/api-docs",

	// Versioned prefixes
	"/api/v1/openapi.json",
	"/api/v2/openapi.json",
	"/api/v1/swagger.json",
	"/api/v2/swagger.json",
}

// specURLRegex extracts spec URLs from Swagger UI HTML pages.
var specURLRegex = regexp.MustCompile(`(?:url\s*[:=]\s*["']|spec[Uu]rl\s*[:=]\s*["']|configUrl\s*[:=]\s*["'])(https?://[^"'\s]+|/[^"'\s]+)`)

// linkHeaderRegex extracts OpenAPI spec links from HTTP Link headers.
var linkHeaderRegex = regexp.MustCompile(`<([^>]+)>;\s*rel="(?:service-desc|describedby)"`)

// htmlProbePaths are paths that may host Swagger UI with embedded spec URLs.
var htmlProbePaths = []string{
	"/swagger-ui.html",
	"/swagger-ui/index.html",
	"/swagger",
	"/docs",
	"/api/docs",
	"/redoc",
	"/api-docs/swagger-config",
}

// LoadSpec loads an OpenAPI spec from a file path or URL.
func LoadSpec(specPath string) (*openapi3.T, error) {
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = false

	if strings.HasPrefix(specPath, "http://") || strings.HasPrefix(specPath, "https://") {
		uri, err := url.Parse(specPath)
		if err != nil {
			return nil, err
		}
		return loader.LoadFromURI(uri)
	}
	return loader.LoadFromFile(specPath)
}

// probeResult holds the outcome of a single probe attempt.
type probeResult struct {
	doc     *openapi3.T
	specURL string
}

// DiscoverSpec tries common spec paths against a base URL and returns the first valid one.
// It probes paths concurrently for speed, then falls back to HTML page parsing.
func DiscoverSpec(baseURL string) (*openapi3.T, string, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	client := &http.Client{Timeout: 5 * time.Second}

	// Phase 1: check Link header on the base URL itself.
	if doc, specURL, ok := checkLinkHeader(client, baseURL); ok {
		return doc, specURL, nil
	}

	// Phase 2: concurrent probe of common spec paths.
	if doc, specURL, ok := concurrentProbe(client, baseURL, probePaths); ok {
		return doc, specURL, nil
	}

	// Phase 3: parse HTML pages (Swagger UI / ReDoc) for embedded spec URLs.
	if doc, specURL, ok := discoverFromHTML(client, baseURL); ok {
		return doc, specURL, nil
	}

	return nil, "", fmt.Errorf("no OpenAPI spec found at %s (tried %d paths + %d HTML pages)",
		baseURL, len(probePaths), len(htmlProbePaths))
}

// checkLinkHeader fetches the base URL and looks for a Link header with rel="service-desc" or rel="describedby".
func checkLinkHeader(client *http.Client, baseURL string) (*openapi3.T, string, bool) {
	resp, err := client.Head(baseURL)
	if err != nil {
		return nil, "", false
	}
	resp.Body.Close()

	for _, link := range resp.Header.Values("Link") {
		matches := linkHeaderRegex.FindStringSubmatch(link)
		if len(matches) < 2 {
			continue
		}
		specURL := resolveURL(baseURL, matches[1])
		if doc, err := LoadSpec(specURL); err == nil {
			return doc, specURL, true
		}
	}
	return nil, "", false
}

// concurrentProbe probes multiple paths in parallel, returns the first valid spec.
func concurrentProbe(client *http.Client, baseURL string, paths []string) (*openapi3.T, string, bool) {
	type indexedResult struct {
		idx int
		res probeResult
	}

	results := make(chan indexedResult, len(paths))
	var wg sync.WaitGroup

	for i, path := range paths {
		wg.Add(1)
		go func(idx int, p string) {
			defer wg.Done()
			specURL := baseURL + p
			if doc, ok := tryLoadSpec(client, specURL); ok {
				results <- indexedResult{idx: idx, res: probeResult{doc: doc, specURL: specURL}}
			}
		}(i, path)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect all results, pick the one with the lowest index (highest priority).
	var best *indexedResult
	for r := range results {
		r := r
		if best == nil || r.idx < best.idx {
			best = &r
		}
	}

	if best != nil {
		return best.res.doc, best.res.specURL, true
	}
	return nil, "", false
}

// discoverFromHTML probes HTML pages and extracts spec URLs from their content.
func discoverFromHTML(client *http.Client, baseURL string) (*openapi3.T, string, bool) {
	for _, path := range htmlProbePaths {
		pageURL := baseURL + path
		resp, err := client.Get(pageURL)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}

		ct := resp.Header.Get("Content-Type")
		if !strings.Contains(ct, "text/html") {
			resp.Body.Close()
			continue
		}

		body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024)) // 512KB limit
		resp.Body.Close()
		if err != nil {
			continue
		}

		matches := specURLRegex.FindAllSubmatch(body, -1)
		for _, m := range matches {
			specURL := resolveURL(baseURL, string(m[1]))
			if doc, ok := tryLoadSpec(client, specURL); ok {
				return doc, specURL, true
			}
		}
	}
	return nil, "", false
}

// tryLoadSpec fetches a URL and attempts to parse it as an OpenAPI spec.
// It checks Content-Type to avoid parsing HTML as JSON.
func tryLoadSpec(client *http.Client, specURL string) (*openapi3.T, bool) {
	resp, err := client.Get(specURL)
	if err != nil {
		return nil, false
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, false
	}

	ct := resp.Header.Get("Content-Type")
	if strings.Contains(ct, "text/html") {
		return nil, false
	}

	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = false
	uri, _ := url.Parse(specURL)
	doc, err := loader.LoadFromURI(uri)
	if err != nil {
		return nil, false
	}
	return doc, true
}

// resolveURL resolves a potentially relative URL against a base.
func resolveURL(baseURL, ref string) string {
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return ref
	}
	return strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(ref, "/")
}
