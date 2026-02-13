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

// GeminiClient talks to Google's Gemini REST API natively.
type GeminiClient struct {
	apiBase    string
	apiKey     string
	model      string
	stream     bool
	httpClient *http.Client
}

func NewGeminiClient(apiBase, apiKey, model, proxy string) *GeminiClient {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if proxy != "" {
		if proxyURL, err := url.Parse(proxy); err == nil {
			transport.Proxy = http.ProxyURL(proxyURL)
		}
	}
	return &GeminiClient{
		apiBase:    strings.TrimRight(apiBase, "/"),
		apiKey:     apiKey,
		model:      model,
		stream:     true,
		httpClient: &http.Client{Transport: transport},
	}
}

// ── Gemini request/response types ────────────────────────────────────

type geminiRequest struct {
	Contents          []geminiContent          `json:"contents"`
	Tools             []geminiTool             `json:"tools,omitempty"`
	SystemInstruction *geminiSystemInstruction `json:"systemInstruction,omitempty"`
}

type geminiSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text             string              `json:"text,omitempty"`
	FunctionCall     *geminiFunctionCall `json:"functionCall,omitempty"`
	FunctionResponse *geminiToolResponse `json:"functionResponse,omitempty"`
}

type geminiFunctionCall struct {
	Name string                 `json:"name"`
	Args map[string]interface{} `json:"args,omitempty"`
}

type geminiToolResponse struct {
	Name     string                 `json:"name"`
	Response map[string]interface{} `json:"response"`
}

type geminiTool struct {
	FunctionDeclarations []geminiFunction `json:"functionDeclarations"`
}

type geminiFunction struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters,omitempty"`
}

// response types
type geminiStreamChunk struct {
	Candidates    []geminiCandidate `json:"candidates"`
	UsageMetadata *geminiUsage      `json:"usageMetadata,omitempty"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

type geminiUsage struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}

// ── ChatStreamWithTools ──────────────────────────────────────────────

func (g *GeminiClient) ChatStreamWithTools(ctx context.Context, messages []Message, tools []Tool, onDelta func(string)) (*Message, *Usage, error) {
	reqBody := g.buildRequest(messages, tools)

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("marshal request: %w", err)
	}

	var endpoint string
	if g.stream {
		endpoint = fmt.Sprintf("%s/models/%s:streamGenerateContent?alt=sse&key=%s",
			g.apiBase, g.model, g.apiKey)
	} else {
		endpoint = fmt.Sprintf("%s/models/%s:generateContent?key=%s",
			g.apiBase, g.model, g.apiKey)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, nil, fmt.Errorf("Gemini API error %d: %s", resp.StatusCode, string(respBody))
	}

	if g.stream {
		return g.parseSSE(resp.Body, onDelta)
	}
	return g.parseJSON(resp.Body, onDelta)
}

// ── internal helpers ─────────────────────────────────────────────────

func (g *GeminiClient) buildRequest(messages []Message, tools []Tool) geminiRequest {
	var req geminiRequest

	// Convert tools
	if len(tools) > 0 {
		var decls []geminiFunction
		for _, t := range tools {
			decls = append(decls, geminiFunction{
				Name:        t.Function.Name,
				Description: t.Function.Description,
				Parameters:  t.Function.Parameters,
			})
		}
		req.Tools = []geminiTool{{FunctionDeclarations: decls}}
	}

	// Build a map of tool_call_id → function name for resolving tool results.
	tcNames := make(map[string]string)
	for _, m := range messages {
		for _, tc := range m.ToolCalls {
			tcNames[tc.ID] = tc.Function.Name
		}
	}

	// Convert messages; collect consecutive tool results into one user turn.
	var pendingToolParts []geminiPart

	flushToolParts := func() {
		if len(pendingToolParts) == 0 {
			return
		}
		req.Contents = append(req.Contents, geminiContent{
			Role:  "user",
			Parts: pendingToolParts,
		})
		pendingToolParts = nil
	}

	for _, m := range messages {
		switch m.Role {
		case "system":
			req.SystemInstruction = &geminiSystemInstruction{
				Parts: []geminiPart{{Text: m.Content}},
			}

		case "user":
			flushToolParts()
			req.Contents = append(req.Contents, geminiContent{
				Role:  "user",
				Parts: []geminiPart{{Text: m.Content}},
			})

		case "assistant":
			flushToolParts()
			var parts []geminiPart
			if m.Content != "" {
				parts = append(parts, geminiPart{Text: m.Content})
			}
			for _, tc := range m.ToolCalls {
				var args map[string]interface{}
				json.Unmarshal([]byte(tc.Function.Arguments), &args)
				parts = append(parts, geminiPart{
					FunctionCall: &geminiFunctionCall{
						Name: tc.Function.Name,
						Args: args,
					},
				})
			}
			if len(parts) > 0 {
				req.Contents = append(req.Contents, geminiContent{
					Role:  "model",
					Parts: parts,
				})
			}

		case "tool":
			name := tcNames[m.ToolCallID]
			if name == "" {
				name = m.ToolCallID
			}
			pendingToolParts = append(pendingToolParts, geminiPart{
				FunctionResponse: &geminiToolResponse{
					Name:     name,
					Response: map[string]interface{}{"result": m.Content},
				},
			})
		}
	}
	flushToolParts()

	return req
}

func (g *GeminiClient) parseSSE(r io.Reader, onDelta func(string)) (*Message, *Usage, error) {
	assembled := &Message{Role: "assistant"}
	var usage *Usage
	tcIndex := 0

	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")

		var chunk geminiStreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		if chunk.UsageMetadata != nil {
			usage = &Usage{
				PromptTokens:     chunk.UsageMetadata.PromptTokenCount,
				CompletionTokens: chunk.UsageMetadata.CandidatesTokenCount,
				TotalTokens:      chunk.UsageMetadata.TotalTokenCount,
			}
		}

		if len(chunk.Candidates) == 0 {
			continue
		}

		for _, part := range chunk.Candidates[0].Content.Parts {
			if part.Text != "" {
				assembled.Content += part.Text
				if onDelta != nil {
					onDelta(part.Text)
				}
			}
			if part.FunctionCall != nil {
				argsBytes, _ := json.Marshal(part.FunctionCall.Args)
				assembled.ToolCalls = append(assembled.ToolCalls, ToolCall{
					ID:   fmt.Sprintf("gemini_%d", tcIndex),
					Type: "function",
					Function: FunctionCall{
						Name:      part.FunctionCall.Name,
						Arguments: string(argsBytes),
					},
				})
				tcIndex++
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, usage, err
	}

	return assembled, usage, nil
}

func (g *GeminiClient) parseJSON(r io.Reader, onDelta func(string)) (*Message, *Usage, error) {
	var chunk geminiStreamChunk
	if err := json.NewDecoder(r).Decode(&chunk); err != nil {
		return nil, nil, fmt.Errorf("decode response: %w", err)
	}

	assembled := &Message{Role: "assistant"}
	var usage *Usage

	if chunk.UsageMetadata != nil {
		usage = &Usage{
			PromptTokens:     chunk.UsageMetadata.PromptTokenCount,
			CompletionTokens: chunk.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      chunk.UsageMetadata.TotalTokenCount,
		}
	}

	if len(chunk.Candidates) > 0 {
		for i, part := range chunk.Candidates[0].Content.Parts {
			if part.Text != "" {
				assembled.Content += part.Text
			}
			if part.FunctionCall != nil {
				argsBytes, _ := json.Marshal(part.FunctionCall.Args)
				assembled.ToolCalls = append(assembled.ToolCalls, ToolCall{
					ID:   fmt.Sprintf("gemini_%d", i),
					Type: "function",
					Function: FunctionCall{
						Name:      part.FunctionCall.Name,
						Arguments: string(argsBytes),
					},
				})
			}
		}
	}

	if assembled.Content != "" && onDelta != nil {
		onDelta(assembled.Content)
	}

	return assembled, usage, nil
}
