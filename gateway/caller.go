package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Caller struct {
	endpoints      map[string]*Endpoint
	httpClient     *http.Client
	healthCache    map[string]time.Time
	healthCacheMu  sync.RWMutex
	healthCacheTTL time.Duration
}

func NewCaller(endpoints map[string]*Endpoint) *Caller {
	// Create cookie jar for automatic session management
	jar, _ := cookiejar.New(nil)
	return &Caller{
		endpoints: endpoints,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Jar:     jar, // Auto-manage cookies across requests
		},
		healthCache:    make(map[string]time.Time),
		healthCacheTTL: 30 * time.Second,
	}
}

func (c *Caller) AddEndpoints(endpoints map[string]*Endpoint) {
	for k, v := range endpoints {
		c.endpoints[k] = v
	}
}

func (c *Caller) HasTool(name string) bool {
	_, ok := c.endpoints[name]
	return ok
}

func (c *Caller) Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error) {
	ep, ok := c.endpoints[toolName]
	if !ok {
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}

	// Check target server reachability
	if err := c.checkHealth(ep.BaseURL); err != nil {
		return "", fmt.Errorf("target server unreachable (%s): %w", ep.BaseURL, err)
	}

	var args map[string]interface{}
	if argsJSON != "" {
		if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
			return "", fmt.Errorf("parse arguments: %w", err)
		}
	}

	// Build URL with path parameters
	urlPath := ep.Path
	for _, p := range ep.Params {
		if p.In == "path" {
			if val, ok := args[p.Name]; ok {
				urlPath = strings.ReplaceAll(urlPath, "{"+p.Name+"}", url.PathEscape(fmt.Sprint(val)))
				delete(args, p.Name)
			}
		}
	}
	fullURL := strings.TrimRight(ep.BaseURL, "/") + urlPath

	// Query parameters
	reqURL, err := url.Parse(fullURL)
	if err != nil {
		return "", fmt.Errorf("parse url: %w", err)
	}
	q := reqURL.Query()
	for _, p := range ep.Params {
		if p.In == "query" {
			if val, ok := args[p.Name]; ok {
				q.Set(p.Name, fmt.Sprint(val))
				delete(args, p.Name)
			}
		}
	}
	reqURL.RawQuery = q.Encode()

	// Request body
	var bodyReader io.Reader
	if ep.HasBody {
		if bodyData, ok := args["body"]; ok {
			bodyJSON, err := json.Marshal(bodyData)
			if err != nil {
				return "", fmt.Errorf("marshal body: %w", err)
			}
			bodyReader = bytes.NewReader(bodyJSON)
		}
	}

	req, err := http.NewRequestWithContext(ctx, ep.Method, reqURL.String(), bodyReader)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	// Auth (client token takes precedence, fallback to configured default)
	switch ep.Auth.Type {
	case "bearer":
		token := authToken
		if token == "" {
			token = ep.Auth.Token
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	case "header":
		token := authToken
		if token == "" {
			token = ep.Auth.Token
		}
		if token != "" && ep.Auth.HeaderName != "" {
			req.Header.Set(ep.Auth.HeaderName, token)
		}
	}

	// Header parameters
	for _, p := range ep.Params {
		if p.In == "header" {
			if val, ok := args[p.Name]; ok {
				req.Header.Set(p.Name, fmt.Sprint(val))
			}
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody)), nil
	}
	return string(respBody), nil
}

// checkHealth verifies that the target server is reachable.
// Uses an in-memory cache to avoid repeated health checks.
func (c *Caller) checkHealth(baseURL string) error {
	// Check cache first
	c.healthCacheMu.RLock()
	lastCheck, exists := c.healthCache[baseURL]
	c.healthCacheMu.RUnlock()

	if exists && time.Since(lastCheck) < c.healthCacheTTL {
		return nil // Cache hit — server was reachable recently
	}

	// Perform health check with short timeout
	checkClient := &http.Client{Timeout: 2 * time.Second}
	resp, err := checkClient.Head(baseURL)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	resp.Body.Close()

	// Any response (even 404) means server is reachable
	// Update cache
	c.healthCacheMu.Lock()
	c.healthCache[baseURL] = time.Now()
	c.healthCacheMu.Unlock()

	return nil
}
