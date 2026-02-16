package nluisdk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is a Go SDK for NLUI HTTP API.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// NewClient creates a new NLUI client.
func NewClient(baseURL string) *Client {
	return &Client{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// WithAPIKey sets the API key for authentication.
func (c *Client) WithAPIKey(key string) *Client {
	c.APIKey = key
	return c
}

// WithHTTPClient sets a custom HTTP client.
func (c *Client) WithHTTPClient(client *http.Client) *Client {
	c.HTTPClient = client
	return c
}

// ============= Types =============

type HealthResponse struct {
	Status string `json:"status"`
	Tools  int    `json:"tools"`
}

type InfoResponse struct {
	Language string `json:"language"`
	Tools    int    `json:"tools"`
}

type Conversation struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Messages       []Message `json:"messages"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	EnabledSources []string  `json:"enabled_sources,omitempty"`
	DisabledTools  []string  `json:"disabled_tools,omitempty"`
}

type Message struct {
	Role      string     `json:"role"`
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}

type ToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type ChatEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ============= Phase 1-5 Types =============

type Target struct {
	Name        string `json:"name"`
	BaseURL     string `json:"base_url"`
	Spec        string `json:"spec,omitempty"`
	Tools       string `json:"tools,omitempty"`
	AuthType    string `json:"auth_type,omitempty"`
	AuthToken   string `json:"auth_token,omitempty"`
	Description string `json:"description,omitempty"`
	ToolCount   int    `json:"tool_count,omitempty"`
}

type Tool struct {
	Name        string `json:"name"`
	Source      string `json:"source"`
	Description string `json:"description"`
}

type ToolSource struct {
	Name      string `json:"name"`
	Type      string `json:"type"` // "openapi" or "mcp"
	ToolCount int    `json:"tool_count"`
}

type ToolConfig struct {
	EnabledSources []string `json:"enabled_sources"`
	DisabledTools  []string `json:"disabled_tools"`
}

type LLMConfig struct {
	APIBase string `json:"api_base"`
	APIKey  string `json:"api_key"`
	Model   string `json:"model"`
}

type LLMProvider struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type ProxyConfig struct {
	Proxy string `json:"proxy"`
}

type SimpleResponse struct {
	Message string `json:"message"`
}

type AddTargetResponse struct {
	Message   string `json:"message"`
	ToolCount int    `json:"tool_count"`
}

type ProbeTargetResponse struct {
	Found     bool   `json:"found"`
	SpecURL   string `json:"spec_url,omitempty"`
	ToolCount int    `json:"tool_count,omitempty"`
	Message   string `json:"message"`
}

// ============= API Methods =============

// Health checks the health of the NLUI server.
func (c *Client) Health(ctx context.Context) (*HealthResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/health", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("health check failed: %s", resp.Status)
	}

	var result HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Info retrieves server information.
func (c *Client) Info(ctx context.Context) (*InfoResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/info", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("info request failed: %s", resp.Status)
	}

	var result InfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ChatOptions holds options for the Chat method.
type ChatOptions struct {
	ConversationID string
	OnEvent        func(event ChatEvent)
	OnDone         func(conversationID string)
}

// Chat sends a chat message and streams the response via SSE.
func (c *Client) Chat(ctx context.Context, message string, opts ChatOptions) error {
	body := map[string]string{
		"message":         message,
		"conversation_id": opts.ConversationID,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/chat", bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("chat request failed: %s", resp.Status)
	}

	// Parse SSE stream
	return c.parseSSE(resp.Body, opts.OnEvent, opts.OnDone)
}

func (c *Client) parseSSE(r io.Reader, onEvent func(ChatEvent), onDone func(string)) error {
	buf := make([]byte, 4096)
	leftover := ""

	for {
		n, err := r.Read(buf)
		if n > 0 {
			leftover += string(buf[:n])
			lines := splitLines(&leftover)

			var currentEvent string
			for _, line := range lines {
				if line == "" {
					continue
				}
				if len(line) > 7 && line[:7] == "event: " {
					currentEvent = line[7:]
					continue
				}
				if len(line) > 6 && line[:6] == "data: " {
					data := line[6:]
					var parsed map[string]interface{}
					if err := json.Unmarshal([]byte(data), &parsed); err == nil {
						// Check for done event
						if convID, ok := parsed["conversation_id"].(string); ok && onDone != nil {
							onDone(convID)
							continue
						}
						// Other events
						if onEvent != nil {
							onEvent(ChatEvent{
								Type: currentEvent,
								Data: json.RawMessage(data),
							})
						}
					}
				}
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func splitLines(buffer *string) []string {
	var lines []string
	for {
		idx := -1
		for i := 0; i < len(*buffer); i++ {
			if (*buffer)[i] == '\n' {
				idx = i
				break
			}
		}
		if idx == -1 {
			break
		}
		line := (*buffer)[:idx]
		if len(line) > 0 && line[len(line)-1] == '\r' {
			line = line[:len(line)-1]
		}
		lines = append(lines, line)
		*buffer = (*buffer)[idx+1:]
	}
	return lines
}

// ListConversations retrieves all conversations.
func (c *Client) ListConversations(ctx context.Context) ([]*Conversation, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/conversations", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list conversations failed: %s", resp.Status)
	}

	var result []*Conversation
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateConversation creates a new conversation.
func (c *Client) CreateConversation(ctx context.Context, title string) (*Conversation, error) {
	body := map[string]string{"title": title}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/conversations", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("create conversation failed: %s", resp.Status)
	}

	var result Conversation
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetConversation retrieves a conversation by ID.
func (c *Client) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/conversations/"+id, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("conversation not found")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get conversation failed: %s", resp.Status)
	}

	var result Conversation
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// DeleteConversation deletes a conversation by ID.
func (c *Client) DeleteConversation(ctx context.Context, id string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE", c.BaseURL+"/api/conversations/"+id, nil)
	if err != nil {
		return err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("delete conversation failed: %s", resp.Status)
	}
	return nil
}

// ============= Phase 1: Targets Management =============

// AddTarget dynamically adds an API target (OpenAPI spec or ToolSet JSON).
func (c *Client) AddTarget(ctx context.Context, target Target) (*AddTargetResponse, error) {
	body := map[string]string{
		"name":        target.Name,
		"base_url":    target.BaseURL,
		"spec":        target.Spec,
		"tools":       target.Tools,
		"auth_type":   target.AuthType,
		"auth_token":  target.AuthToken,
		"description": target.Description,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/targets", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("add target failed: %s", resp.Status)
	}

	var result AddTargetResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ListTargets retrieves all configured OpenAPI targets.
func (c *Client) ListTargets(ctx context.Context) ([]*Target, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/targets", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list targets failed: %s", resp.Status)
	}

	var result []*Target
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// RemoveTarget deletes a target by name.
func (c *Client) RemoveTarget(ctx context.Context, name string) (*SimpleResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "DELETE", c.BaseURL+"/api/targets/"+name, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remove target failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ProbeTarget probes a URL to automatically discover OpenAPI spec.
func (c *Client) ProbeTarget(ctx context.Context, baseURL string) (*ProbeTargetResponse, error) {
	body := map[string]string{"base_url": baseURL}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/targets/probe", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("probe target failed: %s", resp.Status)
	}

	var result ProbeTargetResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ============= Phase 2: Tools Management =============

// ListTools retrieves all available tools.
func (c *Client) ListTools(ctx context.Context) ([]*Tool, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/tools", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list tools failed: %s", resp.Status)
	}

	var result []*Tool
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// ListToolSources retrieves all tool sources (OpenAPI / MCP).
func (c *Client) ListToolSources(ctx context.Context) ([]*ToolSource, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/tools/sources", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list tool sources failed: %s", resp.Status)
	}

	var result []*ToolSource
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// GetConversationTools retrieves tool configuration for a conversation.
func (c *Client) GetConversationTools(ctx context.Context, conversationID string) (*ToolConfig, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/conversations/"+conversationID+"/tools", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get conversation tools failed: %s", resp.Status)
	}

	var result ToolConfig
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpdateConversationTools updates tool configuration for a conversation.
func (c *Client) UpdateConversationTools(ctx context.Context, conversationID string, config ToolConfig) (*SimpleResponse, error) {
	bodyBytes, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", c.BaseURL+"/api/conversations/"+conversationID+"/tools", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("update conversation tools failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ============= Phase 3: Message Editing & Regeneration =============

// EditMessageOptions holds options for editing a message.
type EditMessageOptions struct {
	OnEvent func(event ChatEvent)
	OnDone  func(conversationID string)
}

// EditMessage edits a message and regenerates from that point.
func (c *Client) EditMessage(ctx context.Context, conversationID string, messageIndex int, newContent string, opts EditMessageOptions) error {
	body := map[string]string{"content": newContent}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/conversations/%s/messages/%d", c.BaseURL, conversationID, messageIndex)
	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("edit message failed: %s", resp.Status)
	}

	return c.parseSSE(resp.Body, opts.OnEvent, opts.OnDone)
}

// RegenerateFromOptions holds options for regenerating from a message index.
type RegenerateFromOptions struct {
	OnEvent func(event ChatEvent)
	OnDone  func(conversationID string)
}

// RegenerateFrom regenerates conversation from a specific message index.
func (c *Client) RegenerateFrom(ctx context.Context, conversationID string, fromIndex int, opts RegenerateFromOptions) error {
	body := map[string]int{"from_index": fromIndex}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/conversations/%s/regenerate", c.BaseURL, conversationID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("regenerate failed: %s", resp.Status)
	}

	return c.parseSSE(resp.Body, opts.OnEvent, opts.OnDone)
}

// DeleteMessage deletes a single message.
func (c *Client) DeleteMessage(ctx context.Context, conversationID string, messageIndex int) (*SimpleResponse, error) {
	url := fmt.Sprintf("%s/api/conversations/%s/messages/%d", c.BaseURL, conversationID, messageIndex)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("delete message failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// DeleteMessagesFrom deletes all messages from a specific index.
func (c *Client) DeleteMessagesFrom(ctx context.Context, conversationID string, messageIndex int) (*SimpleResponse, error) {
	url := fmt.Sprintf("%s/api/conversations/%s/messages/%d/from", c.BaseURL, conversationID, messageIndex)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("delete messages from failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ============= Phase 4: LLM Configuration =============

// GetLLMConfig retrieves the current LLM configuration.
func (c *Client) GetLLMConfig(ctx context.Context) (*LLMConfig, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/config/llm", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get LLM config failed: %s", resp.Status)
	}

	var result LLMConfig
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpdateLLMConfig updates the LLM configuration.
func (c *Client) UpdateLLMConfig(ctx context.Context, config LLMConfig) (*SimpleResponse, error) {
	bodyBytes, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", c.BaseURL+"/api/config/llm", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("update LLM config failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ProbeLLMProviders discovers available LLM providers (local + cloud).
func (c *Client) ProbeLLMProviders(ctx context.Context) ([]*LLMProvider, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/config/llm/providers", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("probe LLM providers failed: %s", resp.Status)
	}

	var result []*LLMProvider
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// FetchModels retrieves the list of models from a specific LLM provider.
func (c *Client) FetchModels(ctx context.Context, apiBase, apiKey string) ([]string, error) {
	body := map[string]string{
		"api_base": apiBase,
		"api_key":  apiKey,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/config/llm/models", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch models failed: %s", resp.Status)
	}

	var result []string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// ============= Phase 5: Proxy Configuration =============

// GetProxyConfig retrieves the current proxy configuration.
func (c *Client) GetProxyConfig(ctx context.Context) (*ProxyConfig, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/api/config/proxy", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get proxy config failed: %s", resp.Status)
	}

	var result ProxyConfig
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// UpdateProxyConfig updates the proxy configuration.
func (c *Client) UpdateProxyConfig(ctx context.Context, proxy string) (*SimpleResponse, error) {
	body := map[string]string{"proxy": proxy}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", c.BaseURL+"/api/config/proxy", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("update proxy config failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// TestProxy tests the proxy connection.
func (c *Client) TestProxy(ctx context.Context, proxy string) (*SimpleResponse, error) {
	body := map[string]string{"proxy": proxy}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/config/proxy/test", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("test proxy failed: %s", resp.Status)
	}

	var result SimpleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}
