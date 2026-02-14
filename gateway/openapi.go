package gateway

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
)

// Common spec paths to probe when no explicit spec is configured.
var probePaths = []string{
	"/swagger/doc.json",
	"/swagger.json",
	"/openapi.json",
	"/openapi.yaml",
	"/v3/api-docs",
	"/v2/api-docs",
	"/api-docs",
	"/docs/openapi.json",
	"/docs/swagger.json",
	"/api/swagger.json",
	"/api/openapi.json",
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

// DiscoverSpec tries common spec paths against a base URL and returns the first valid one.
func DiscoverSpec(baseURL string) (*openapi3.T, string, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = false
	client := &http.Client{Timeout: 5 * time.Second}

	for _, path := range probePaths {
		specURL := baseURL + path
		resp, err := client.Get(specURL)
		if err != nil {
			continue
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			continue
		}

		uri, _ := url.Parse(specURL)
		doc, err := loader.LoadFromURI(uri)
		if err != nil {
			continue
		}

		return doc, specURL, nil
	}

	return nil, "", fmt.Errorf("no OpenAPI spec found at %s (tried %d paths)", baseURL, len(probePaths))
}
