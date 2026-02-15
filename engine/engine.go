package engine

import (
	"context"
	"fmt"

	"github.com/ZacharyZcR/Kelper/core/conversation"
	"github.com/ZacharyZcR/Kelper/core/llm"
	"github.com/ZacharyZcR/Kelper/core/toolloop"
)

// Type aliases — hosts only need to import engine.
type Event = toolloop.Event
type Executor = toolloop.Executor
type ConfirmFunc = toolloop.ConfirmFunc
type Tool = llm.Tool
type Message = llm.Message
type Conversation = conversation.Conversation

type Config struct {
	LLM          *llm.Client
	Executor     Executor
	Tools        []Tool
	SystemPrompt string
	MaxCtxTokens int
	ConvDir      string              // "" = in-memory only
	ConvMgr      *conversation.Manager // optional, reuse across reinit
}

type Engine struct {
	loop         *toolloop.Loop
	convMgr      *conversation.Manager
	tools        []Tool
	systemPrompt string
}

func New(cfg Config) *Engine {
	loop := toolloop.New(cfg.LLM, cfg.Executor)
	loop.SetMaxContextTokens(cfg.MaxCtxTokens)

	convMgr := cfg.ConvMgr
	if convMgr == nil {
		convMgr = conversation.NewManager(cfg.ConvDir)
	}

	return &Engine{
		loop:         loop,
		convMgr:      convMgr,
		tools:        cfg.Tools,
		systemPrompt: cfg.SystemPrompt,
	}
}

// Chat runs a full chat turn: get/create conversation → append user msg → loop → update messages.
// Returns the conversation ID used.
func (e *Engine) Chat(ctx context.Context, convID, message, authToken string, onEvent func(Event)) (string, error) {
	conv := e.convMgr.Get(convID)
	isNew := conv == nil
	if isNew {
		conv = e.convMgr.Create("", e.systemPrompt)
	}

	conv.Messages = append(conv.Messages, llm.Message{Role: "user", Content: message})

	if isNew {
		title := message
		if len([]rune(title)) > 30 {
			title = string([]rune(title)[:30]) + "..."
		}
		e.convMgr.UpdateTitle(conv.ID, title)
	}

	finalMessages, err := e.loop.Run(ctx, conv.Messages, e.tools, authToken, onEvent)
	if err != nil {
		e.convMgr.UpdateMessages(conv.ID, finalMessages)
		return conv.ID, fmt.Errorf("chat: %w", err)
	}

	e.convMgr.UpdateMessages(conv.ID, finalMessages)
	return conv.ID, nil
}

func (e *Engine) SetConfirm(fn ConfirmFunc) {
	e.loop.SetConfirm(fn)
}

func (e *Engine) SetMaxContextTokens(n int) {
	e.loop.SetMaxContextTokens(n)
}

func (e *Engine) Tools() []Tool {
	return e.tools
}

func (e *Engine) SystemPrompt() string {
	return e.systemPrompt
}

func (e *Engine) CreateConversation(title string) *Conversation {
	return e.convMgr.Create(title, e.systemPrompt)
}

func (e *Engine) GetConversation(id string) *Conversation {
	return e.convMgr.Get(id)
}

func (e *Engine) ListConversations() []*Conversation {
	return e.convMgr.List()
}

func (e *Engine) DeleteConversation(id string) {
	e.convMgr.Delete(id)
}

// EditMessageAndRegenerate edits a message and regenerates from that point.
func (e *Engine) EditMessageAndRegenerate(ctx context.Context, convID string, msgIndex int, newContent, authToken string, onEvent func(Event)) error {
	if err := e.convMgr.EditMessage(convID, msgIndex, newContent); err != nil {
		return err
	}
	conv := e.convMgr.Get(convID)
	if conv == nil {
		return fmt.Errorf("conversation not found")
	}
	finalMessages, err := e.loop.Run(ctx, conv.Messages, e.tools, authToken, onEvent)
	e.convMgr.UpdateMessages(convID, finalMessages)
	return err
}

// DeleteMessagesFrom deletes messages starting from the given index.
func (e *Engine) DeleteMessagesFrom(convID string, msgIndex int) error {
	return e.convMgr.DeleteMessagesFrom(convID, msgIndex)
}

// DeleteMessage deletes a single message at the given index.
func (e *Engine) DeleteMessage(convID string, msgIndex int) error {
	return e.convMgr.DeleteMessage(convID, msgIndex)
}

// RegenerateFrom regenerates the conversation from a specific message index.
// Useful for retrying after the last assistant message.
func (e *Engine) RegenerateFrom(ctx context.Context, convID string, fromIndex int, authToken string, onEvent func(Event)) error {
	conv := e.convMgr.Get(convID)
	if conv == nil {
		return fmt.Errorf("conversation not found")
	}
	if fromIndex < 0 || fromIndex > len(conv.Messages) {
		return fmt.Errorf("invalid message index")
	}
	truncated := conv.Messages[:fromIndex]
	finalMessages, err := e.loop.Run(ctx, truncated, e.tools, authToken, onEvent)
	e.convMgr.UpdateMessages(convID, finalMessages)
	return err
}
