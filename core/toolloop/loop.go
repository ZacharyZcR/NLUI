package toolloop

import (
	"context"
	"fmt"
	"strings"

	"github.com/ZacharyZcR/NLUI/core/llm"
)

const MaxIterations = 25

type Executor interface {
	Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error)
}

// ConfirmFunc is called before executing a tool that looks dangerous.
// Return true to proceed, false to skip.
type ConfirmFunc func(toolName, argsJSON string) bool

type Event struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type ToolCallEvent struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ToolResultEvent struct {
	Name   string `json:"name"`
	Result string `json:"result"`
}

type ContentEvent struct {
	Text string `json:"text"`
}

type ContentDeltaEvent struct {
	Delta string `json:"delta"`
}

type UsageEvent struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type Loop struct {
	client       llm.LLMClient
	executor     Executor
	confirm      ConfirmFunc
	maxCtxTokens int
}

func New(client llm.LLMClient, executor Executor) *Loop {
	return &Loop{client: client, executor: executor}
}

func (l *Loop) SetConfirm(fn ConfirmFunc) {
	l.confirm = fn
}

func (l *Loop) SetMaxContextTokens(n int) {
	l.maxCtxTokens = n
}

var dangerousPatterns = []string{
	"delete", "remove", "destroy", "drop", "purge", "reset",
}

func isDangerous(toolName, argsJSON string) bool {
	lower := strings.ToLower(toolName)
	for _, p := range dangerousPatterns {
		if strings.Contains(lower, p) {
			return true
		}
	}
	lowerArgs := strings.ToLower(argsJSON)
	for _, m := range []string{`"delete"`, `"put"`, `"patch"`} {
		if strings.Contains(lowerArgs, m) {
			return true
		}
	}
	return false
}

func (l *Loop) Run(ctx context.Context, messages []llm.Message, tools []llm.Tool, authToken string, confirm ConfirmFunc, onEvent func(Event)) ([]llm.Message, error) {
	// Prefer caller-supplied confirm; fall back to instance-level.
	if confirm == nil {
		confirm = l.confirm
	}

	var totalUsage UsageEvent

	for i := 0; i < MaxIterations; i++ {
		truncated := truncateMessages(messages, l.maxCtxTokens)
		msg, usage, err := l.client.ChatStreamWithTools(ctx, truncated, tools, func(delta string) {
			onEvent(Event{Type: "content_delta", Data: ContentDeltaEvent{Delta: delta}})
		})
		if usage != nil {
			totalUsage.PromptTokens += usage.PromptTokens
			totalUsage.CompletionTokens += usage.CompletionTokens
			totalUsage.TotalTokens += usage.TotalTokens
		}
		if err != nil {
			emitUsage(onEvent, totalUsage)
			return messages, fmt.Errorf("LLM call failed: %w", err)
		}

		messages = append(messages, *msg)

		if len(msg.ToolCalls) == 0 {
			onEvent(Event{Type: "content", Data: ContentEvent{Text: msg.Content}})
			emitUsage(onEvent, totalUsage)
			return messages, nil
		}

		for _, tc := range msg.ToolCalls {
			onEvent(Event{Type: "tool_call", Data: ToolCallEvent{
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			}})

			// Confirmation gate for dangerous operations
			if confirm != nil && isDangerous(tc.Function.Name, tc.Function.Arguments) {
				if !confirm(tc.Function.Name, tc.Function.Arguments) {
					result := "Operation canceled by user"
					onEvent(Event{Type: "tool_result", Data: ToolResultEvent{
						Name:   tc.Function.Name,
						Result: result,
					}})
					messages = append(messages, llm.Message{
						Role:       "tool",
						Content:    result,
						ToolCallID: tc.ID,
					})
					continue
				}
			}

			result, err := l.executor.Execute(ctx, tc.Function.Name, tc.Function.Arguments, authToken)
			if err != nil {
				result = fmt.Sprintf("Error: %s", err.Error())
			}
			if len(result) > 4000 {
				result = result[:4000] + "\n...(truncated)"
			}

			onEvent(Event{Type: "tool_result", Data: ToolResultEvent{
				Name:   tc.Function.Name,
				Result: result,
			}})

			messages = append(messages, llm.Message{
				Role:       "tool",
				Content:    result,
				ToolCallID: tc.ID,
			})
		}
	}

	emitUsage(onEvent, totalUsage)
	return messages, fmt.Errorf("max iterations (%d) reached", MaxIterations)
}

func emitUsage(onEvent func(Event), u UsageEvent) {
	if u.TotalTokens > 0 {
		onEvent(Event{Type: "usage", Data: u})
	}
}
