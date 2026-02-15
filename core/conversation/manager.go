package conversation

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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
	mu      sync.RWMutex
	convs   map[string]*Conversation
	dataDir string
}

// NewManager creates a manager. If dataDir is non-empty, conversations
// are persisted as JSON files in that directory.
func NewManager(dataDir string) *Manager {
	m := &Manager{
		convs:   make(map[string]*Conversation),
		dataDir: dataDir,
	}
	if dataDir != "" {
		os.MkdirAll(dataDir, 0755)
		m.loadAll()
	}
	return m
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
	m.saveLocked(conv)
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

func (m *Manager) UpdateTitle(id, title string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if conv, ok := m.convs[id]; ok {
		conv.Title = title
		m.saveLocked(conv)
	}
}

func (m *Manager) UpdateMessages(id string, messages []llm.Message) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if conv, ok := m.convs[id]; ok {
		conv.Messages = messages
		conv.UpdatedAt = time.Now()
		m.saveLocked(conv)
	}
}

func (m *Manager) Delete(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.convs, id)
	if m.dataDir != "" {
		os.Remove(filepath.Join(m.dataDir, id+".json"))
	}
}

// EditMessage replaces the content of a message at the given index and truncates
// all messages after it. Returns error if index is out of bounds.
func (m *Manager) EditMessage(id string, index int, newContent string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	conv, ok := m.convs[id]
	if !ok {
		return fmt.Errorf("conversation not found")
	}
	if index < 0 || index >= len(conv.Messages) {
		return fmt.Errorf("invalid message index")
	}
	conv.Messages[index].Content = newContent
	conv.Messages = conv.Messages[:index+1]
	conv.UpdatedAt = time.Now()
	m.saveLocked(conv)
	return nil
}

// DeleteMessagesFrom removes messages starting from the given index.
func (m *Manager) DeleteMessagesFrom(id string, index int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	conv, ok := m.convs[id]
	if !ok {
		return fmt.Errorf("conversation not found")
	}
	if index < 0 || index >= len(conv.Messages) {
		return fmt.Errorf("invalid message index")
	}
	conv.Messages = conv.Messages[:index]
	conv.UpdatedAt = time.Now()
	m.saveLocked(conv)
	return nil
}

// DeleteMessage removes a single message at the given index.
func (m *Manager) DeleteMessage(id string, index int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	conv, ok := m.convs[id]
	if !ok {
		return fmt.Errorf("conversation not found")
	}
	if index < 0 || index >= len(conv.Messages) {
		return fmt.Errorf("invalid message index")
	}
	conv.Messages = append(conv.Messages[:index], conv.Messages[index+1:]...)
	conv.UpdatedAt = time.Now()
	m.saveLocked(conv)
	return nil
}

// --- persistence ---

func (m *Manager) saveLocked(conv *Conversation) {
	if m.dataDir == "" {
		return
	}
	data, err := json.Marshal(conv)
	if err != nil {
		return
	}
	if err := os.WriteFile(filepath.Join(m.dataDir, conv.ID+".json"), data, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "save conversation %s: %v\n", conv.ID, err)
	}
}

func (m *Manager) loadAll() {
	entries, err := os.ReadDir(m.dataDir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(m.dataDir, e.Name()))
		if err != nil {
			continue
		}
		var conv Conversation
		if json.Unmarshal(data, &conv) == nil && conv.ID != "" {
			m.convs[conv.ID] = &conv
		}
	}
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
