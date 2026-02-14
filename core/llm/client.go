package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type Client struct {
	apiBase    string
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewClient(apiBase, apiKey, model, proxy string) *Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if proxy != "" {
		if proxyURL, err := url.Parse(proxy); err == nil {
			transport.Proxy = http.ProxyURL(proxyURL)
		}
	}
	return &Client{
		apiBase:    strings.TrimRight(apiBase, "/"),
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Transport: transport},
	}
}

func (c *Client) Chat(ctx context.Context, messages []Message, tools []Tool) (*ChatResponse, error) {
	req := ChatRequest{
		Model:    c.model,
		Messages: messages,
		Stream:   false,
	}
	if len(tools) > 0 {
		req.Tools = tools
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.apiBase+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("LLM API error %d: %s", resp.StatusCode, string(respBody))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &chatResp, nil
}

// ChatStreamWithTools sends a streaming request with tools support.
// It assembles the full Message (including tool_calls) from deltas,
// and calls onDelta for each content text chunk (for live UI updates).
// Returns the fully assembled assistant Message.
func (c *Client) ChatStreamWithTools(ctx context.Context, messages []Message, tools []Tool, onDelta func(string)) (*Message, error) {
	req := ChatRequest{
		Model:    c.model,
		Messages: messages,
		Stream:   true,
	}
	if len(tools) > 0 {
		req.Tools = tools
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.apiBase+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("LLM API error %d: %s", resp.StatusCode, string(respBody))
	}

	// Assemble message from stream deltas
	assembled := &Message{Role: "assistant"}
	toolCallMap := make(map[int]*ToolCall)

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}
		var chunk StreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		d := chunk.Choices[0].Delta

		// Content delta
		if d.Content != "" {
			assembled.Content += d.Content
			if onDelta != nil {
				onDelta(d.Content)
			}
		}

		// Tool call deltas
		for _, tc := range d.ToolCalls {
			existing, ok := toolCallMap[tc.Index]
			if !ok {
				existing = &ToolCall{
					ID:   tc.ID,
					Type: "function",
					Function: FunctionCall{
						Name: tc.Function.Name,
					},
				}
				toolCallMap[tc.Index] = existing
			}
			if tc.ID != "" {
				existing.ID = tc.ID
			}
			if tc.Function.Name != "" {
				existing.Function.Name = tc.Function.Name
			}
			existing.Function.Arguments += tc.Function.Arguments
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	// Convert map to sorted slice
	if len(toolCallMap) > 0 {
		maxIdx := 0
		for idx := range toolCallMap {
			if idx > maxIdx {
				maxIdx = idx
			}
		}
		assembled.ToolCalls = make([]ToolCall, maxIdx+1)
		for idx, tc := range toolCallMap {
			assembled.ToolCalls[idx] = *tc
		}
	}

	return assembled, nil
}

func (c *Client) ChatStream(ctx context.Context, messages []Message, onChunk func(StreamChunk)) error {
	req := ChatRequest{
		Model:    c.model,
		Messages: messages,
		Stream:   true,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.apiBase+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LLM API error %d: %s", resp.StatusCode, string(respBody))
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}
		var chunk StreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		onChunk(chunk)
	}
	return scanner.Err()
}
