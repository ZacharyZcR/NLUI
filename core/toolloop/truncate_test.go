package toolloop

import (
	"testing"

	"github.com/ZacharyZcR/NLUI/core/llm"
)

func msgs(roles ...string) []llm.Message {
	out := make([]llm.Message, len(roles))
	for i, r := range roles {
		out[i] = llm.Message{Role: r, Content: "x"}
	}
	return out
}

func TestTruncateDisabledWhenZero(t *testing.T) {
	m := msgs("system", "user", "assistant")
	got := truncateMessages(m, 0)
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
}

func TestTruncateKeepsSystem(t *testing.T) {
	m := []llm.Message{
		{Role: "system", Content: "system prompt here"},
		{Role: "user", Content: "this is a user message with enough chars"},
		{Role: "assistant", Content: "this is an assistant reply with enough chars"},
		{Role: "user", Content: "another user message with enough content"},
		{Role: "assistant", Content: "another assistant reply with enough text"},
	}
	// Budget so tight only system fits (system ~4 tokens, budget 5 leaves ~1 for rest)
	got := truncateMessages(m, 5)
	if len(got) != 1 || got[0].Role != "system" {
		t.Fatalf("expected only system, got %d messages", len(got))
	}
}

func TestTruncatePreservesRecent(t *testing.T) {
	m := []llm.Message{
		{Role: "system", Content: "s"},
		{Role: "user", Content: "old message that is quite long to eat budget"},
		{Role: "assistant", Content: "old reply that is also long enough to matter"},
		{Role: "user", Content: "new"},
		{Role: "assistant", Content: "new"},
	}
	// Budget enough for system + last 2 messages but not all
	got := truncateMessages(m, 20)
	if got[0].Role != "system" {
		t.Fatal("first must be system")
	}
	last := got[len(got)-1]
	if last.Content != "new" {
		t.Fatalf("last message should be newest, got %q", last.Content)
	}
}

func TestTruncateAtomicBlock(t *testing.T) {
	m := []llm.Message{
		{Role: "system", Content: "s"},
		{Role: "user", Content: "hi"},
		{Role: "assistant", Content: "", ToolCalls: []llm.ToolCall{
			{ID: "1", Function: llm.FunctionCall{Name: "f", Arguments: "{}"}},
		}},
		{Role: "tool", Content: "result"},
		{Role: "user", Content: "ok"},
	}
	// Enough budget for system + atomic block (assistant+tool) + user
	got := truncateMessages(m, 100)
	if len(got) != 5 {
		t.Fatalf("expected 5, got %d", len(got))
	}
}

func TestTruncateAtomicBlockNotSplit(t *testing.T) {
	tc := llm.ToolCall{ID: "1", Function: llm.FunctionCall{Name: "fn", Arguments: `{"a":"b"}`}}
	m := []llm.Message{
		{Role: "system", Content: "s"},
		{Role: "assistant", Content: "", ToolCalls: []llm.ToolCall{tc}},
		{Role: "tool", Content: "long result that eats budget significantly so we need lots of room"},
		{Role: "user", Content: "x"},
	}
	// Budget enough for user but not the atomic block
	got := truncateMessages(m, 5)
	// Should keep system + user, skip the atomic block entirely
	hasSystem := false
	hasTool := false
	for _, g := range got {
		if g.Role == "system" {
			hasSystem = true
		}
		if g.Role == "tool" {
			hasTool = true
		}
	}
	if !hasSystem {
		t.Fatal("should keep system")
	}
	if hasTool {
		t.Fatal("should NOT include tool without its assistant")
	}
}

func TestEstimateTokens(t *testing.T) {
	msg := llm.Message{Content: "1234567890123456"} // 16 chars = 4 tokens
	got := estimateTokens(&msg)
	if got != 4 {
		t.Fatalf("expected 4, got %d", got)
	}
}
