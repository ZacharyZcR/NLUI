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
	Role      string      `json:"role"`
	Content   string      `json:"content"`
	ToolCalls []ToolCall  `json:"tool_calls,omitempty"`
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
