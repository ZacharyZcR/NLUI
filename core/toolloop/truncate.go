package toolloop

import "github.com/ZacharyZcR/NLUI/core/llm"

// estimateTokens gives a rough token count (~4 chars per token).
func estimateTokens(msg *llm.Message) int {
	n := len(msg.Content)
	for _, tc := range msg.ToolCalls {
		n += len(tc.Function.Name) + len(tc.Function.Arguments)
	}
	return n / 4
}

// truncateMessages keeps messages within a token budget.
//
// Rules:
//  1. system messages (index 0 if role=="system") are always kept
//  2. recent messages are preserved (scan from tail)
//  3. an assistant message with ToolCalls and its subsequent tool-role messages
//     form an atomic block — they are never split
//  4. maxTokens <= 0 disables truncation
func truncateMessages(messages []llm.Message, maxTokens int) []llm.Message {
	if maxTokens <= 0 || len(messages) == 0 {
		return messages
	}

	// Reserve budget for system message
	budget := maxTokens
	startIdx := 0
	if messages[0].Role == "system" {
		budget -= estimateTokens(&messages[0])
		startIdx = 1
		if budget <= 0 {
			return messages[:1]
		}
	}

	// Build atomic blocks from the non-system portion.
	// A block is either:
	//   - a single user/assistant(no tool calls) message
	//   - an assistant(with tool calls) + all following tool messages
	type block struct {
		start, end int // [start, end)
		tokens     int
	}

	rest := messages[startIdx:]
	var blocks []block
	i := 0
	for i < len(rest) {
		msg := &rest[i]
		if msg.Role == "assistant" && len(msg.ToolCalls) > 0 {
			b := block{start: i, tokens: estimateTokens(msg)}
			j := i + 1
			for j < len(rest) && rest[j].Role == "tool" {
				b.tokens += estimateTokens(&rest[j])
				j++
			}
			b.end = j
			blocks = append(blocks, b)
			i = j
		} else {
			blocks = append(blocks, block{
				start:  i,
				end:    i + 1,
				tokens: estimateTokens(msg),
			})
			i++
		}
	}

	// Scan blocks from tail, accumulate until budget exceeded
	used := 0
	cutBlock := 0 // first block to keep
	for k := len(blocks) - 1; k >= 0; k-- {
		if used+blocks[k].tokens > budget {
			cutBlock = k + 1
			break
		}
		used += blocks[k].tokens
	}

	if cutBlock >= len(blocks) {
		// Nothing fits — keep only system
		if startIdx > 0 {
			return messages[:1]
		}
		return nil
	}

	cutIdx := startIdx + blocks[cutBlock].start
	out := make([]llm.Message, 0, 1+len(messages)-cutIdx)
	if startIdx > 0 {
		out = append(out, messages[0])
	}
	out = append(out, messages[cutIdx:]...)
	return out
}
