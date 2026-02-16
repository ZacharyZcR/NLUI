package llm

import "encoding/json"

type Message struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

type ToolCall struct {
	ID           string          `json:"id"`
	Type         string          `json:"type"`
	Function     FunctionCall    `json:"function"`
	ExtraContent json.RawMessage `json:"extra_content,omitempty"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type Tool struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

type ToolFunction struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters"`
}

type ChatRequest struct {
	Model         string         `json:"model"`
	Messages      []Message      `json:"messages"`
	Tools         []Tool         `json:"tools,omitempty"`
	Stream        bool           `json:"stream"`
	StreamOptions *StreamOptions `json:"stream_options,omitempty"`
}

type StreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type ChatResponse struct {
	ID      string   `json:"id"`
	Choices []Choice `json:"choices"`
	Usage   *Usage   `json:"usage,omitempty"`
}

type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason *string `json:"finish_reason"`
}

type StreamChunk struct {
	ID      string         `json:"id"`
	Choices []StreamChoice `json:"choices"`
	Usage   *Usage         `json:"usage,omitempty"`
}

type StreamChoice struct {
	Index        int         `json:"index"`
	Delta        StreamDelta `json:"delta"`
	FinishReason *string     `json:"finish_reason"`
}

// StreamDelta is the delta payload in a streaming chunk.
// Separate from Message because tool_calls have an extra "index" field.
type StreamDelta struct {
	Role      string           `json:"role,omitempty"`
	Content   string           `json:"content,omitempty"`
	ToolCalls []StreamToolCall `json:"tool_calls,omitempty"`
}

type StreamToolCall struct {
	Index        int             `json:"index"`
	ID           string          `json:"id,omitempty"`
	Type         string          `json:"type,omitempty"`
	Function     FunctionCall    `json:"function"`
	ExtraContent json.RawMessage `json:"extra_content,omitempty"`
}
