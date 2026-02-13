package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type Caller struct {
	endpoints  map[string]*Endpoint
	httpClient *http.Client
}

func NewCaller(endpoints map[string]*Endpoint) *Caller {
	return &Caller{
		endpoints:  endpoints,
		httpClient: &http.Client{},
	}
}

func (c *Caller) AddEndpoints(endpoints map[string]*Endpoint) {
	for k, v := range endpoints {
		c.endpoints[k] = v
	}
}

func (c *Caller) Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error) {
	ep, ok := c.endpoints[toolName]
	if !ok {
		return "", fmt.Errorf("unknown tool: %s", toolName)
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
				urlPath = strings.ReplaceAll(urlPath, "{"+p.Name+"}", fmt.Sprint(val))
				delete(args, p.Name)
			}
		}
	}
	fullURL := strings.TrimRight(ep.BaseURL, "/") + urlPath

	// Query parameters
	reqURL, _ := url.Parse(fullURL)
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

	// Auth
	switch ep.Auth.Type {
	case "bearer":
		if authToken != "" {
			req.Header.Set("Authorization", "Bearer "+authToken)
		}
	case "header":
		if authToken != "" && ep.Auth.HeaderName != "" {
			req.Header.Set(ep.Auth.HeaderName, authToken)
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
