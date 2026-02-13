package conversation

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/ZacharyZcR/Kelper/core/llm"
)

type Conversation struct {
	ID        string        `json:"id"`
	Title     string        `json:"title"`
	Messages  []llm.Message `json:"messages"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type Manager struct {
	mu    sync.RWMutex
	convs map[string]*Conversation
}

func NewManager() *Manager {
	return &Manager{
		convs: make(map[string]*Conversation),
	}
}

func (m *Manager) Create(title, systemPrompt string) *Conversation {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	conv := &Conversation{
		ID:        newID(),
		Title:     title,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if systemPrompt != "" {
		conv.Messages = append(conv.Messages, llm.Message{
			Role:    "system",
			Content: systemPrompt,
		})
	}
	m.convs[conv.ID] = conv
	return conv
}

func (m *Manager) Get(id string) *Conversation {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.convs[id]
}

func (m *Manager) List() []*Conversation {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list := make([]*Conversation, 0, len(m.convs))
	for _, c := range m.convs {
		list = append(list, c)
	}
	return list
}

func (m *Manager) UpdateMessages(id string, messages []llm.Message) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if conv, ok := m.convs[id]; ok {
		conv.Messages = messages
		conv.UpdatedAt = time.Now()
	}
}

func (m *Manager) Delete(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.convs, id)
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
