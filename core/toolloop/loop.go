package toolloop

import (
	"context"
	"fmt"

	"github.com/ZacharyZcR/Kelper/core/llm"
)

const MaxIterations = 25

type Executor interface {
	Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error)
}

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

type Loop struct {
	client   *llm.Client
	executor Executor
}

func New(client *llm.Client, executor Executor) *Loop {
	return &Loop{client: client, executor: executor}
}

func (l *Loop) Run(ctx context.Context, messages []llm.Message, tools []llm.Tool, authToken string, onEvent func(Event)) ([]llm.Message, error) {
	for i := 0; i < MaxIterations; i++ {
		resp, err := l.client.Chat(ctx, messages, tools)
		if err != nil {
			return messages, fmt.Errorf("LLM call failed: %w", err)
		}
		if len(resp.Choices) == 0 {
			return messages, fmt.Errorf("empty response from LLM")
		}

		msg := resp.Choices[0].Message
		messages = append(messages, msg)

		if len(msg.ToolCalls) == 0 {
			onEvent(Event{Type: "content", Data: ContentEvent{Text: msg.Content}})
			return messages, nil
		}

		for _, tc := range msg.ToolCalls {
			onEvent(Event{Type: "tool_call", Data: ToolCallEvent{
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			}})

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

	return messages, fmt.Errorf("max iterations (%d) reached", MaxIterations)
}
