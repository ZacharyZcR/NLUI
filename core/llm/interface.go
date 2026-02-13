package llm

import "context"

// LLMClient abstracts the streaming chat+tools API so that different backends
// (OpenAI-compatible, Gemini native, etc.) can be swapped transparently.
type LLMClient interface {
	ChatStreamWithTools(ctx context.Context, messages []Message, tools []Tool,
		onDelta func(string)) (*Message, *Usage, error)
}
