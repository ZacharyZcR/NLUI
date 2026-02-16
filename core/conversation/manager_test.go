package conversation

import (
	"testing"

	"github.com/ZacharyZcR/NLUI/core/llm"
)

func TestCreateAndGet(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "you are a bot")

	if conv.ID == "" {
		t.Fatal("ID should not be empty")
	}
	if conv.Title != "test" {
		t.Errorf("title = %q, want test", conv.Title)
	}
	if len(conv.Messages) != 1 || conv.Messages[0].Role != "system" {
		t.Error("should have system message")
	}

	got := m.Get(conv.ID)
	if got == nil {
		t.Fatal("Get returned nil")
	}
	if got.ID != conv.ID {
		t.Error("ID mismatch")
	}
}

func TestCreateWithoutSystemPrompt(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	if len(conv.Messages) != 0 {
		t.Errorf("expected 0 messages, got %d", len(conv.Messages))
	}
}

func TestList(t *testing.T) {
	m := NewManager("")
	m.Create("a", "")
	m.Create("b", "")
	list := m.List()
	if len(list) != 2 {
		t.Fatalf("expected 2, got %d", len(list))
	}
}

func TestDelete(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	m.Delete(conv.ID)
	if m.Get(conv.ID) != nil {
		t.Fatal("should be deleted")
	}
}

func TestUpdateMessages(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	msgs := []llm.Message{{Role: "user", Content: "hi"}, {Role: "assistant", Content: "hello"}}
	m.UpdateMessages(conv.ID, msgs)

	got := m.Get(conv.ID)
	if len(got.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(got.Messages))
	}
}

func TestEditMessage(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "sys")
	m.UpdateMessages(conv.ID, []llm.Message{
		{Role: "system", Content: "sys"},
		{Role: "user", Content: "old"},
		{Role: "assistant", Content: "reply"},
	})

	err := m.EditMessage(conv.ID, 1, "new")
	if err != nil {
		t.Fatal(err)
	}

	got := m.Get(conv.ID)
	if len(got.Messages) != 2 {
		t.Fatalf("expected 2 messages (truncated after edit), got %d", len(got.Messages))
	}
	if got.Messages[1].Content != "new" {
		t.Errorf("content = %q, want new", got.Messages[1].Content)
	}
}

func TestDeleteMessage(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	m.UpdateMessages(conv.ID, []llm.Message{
		{Role: "user", Content: "a"},
		{Role: "assistant", Content: "b"},
		{Role: "user", Content: "c"},
	})

	err := m.DeleteMessage(conv.ID, 1)
	if err != nil {
		t.Fatal(err)
	}

	got := m.Get(conv.ID)
	if len(got.Messages) != 2 {
		t.Fatalf("expected 2, got %d", len(got.Messages))
	}
	if got.Messages[1].Content != "c" {
		t.Errorf("got %q, want c", got.Messages[1].Content)
	}
}

func TestDeleteMessagesFrom(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	m.UpdateMessages(conv.ID, []llm.Message{
		{Role: "user", Content: "a"},
		{Role: "assistant", Content: "b"},
		{Role: "user", Content: "c"},
	})

	err := m.DeleteMessagesFrom(conv.ID, 1)
	if err != nil {
		t.Fatal(err)
	}

	got := m.Get(conv.ID)
	if len(got.Messages) != 1 {
		t.Fatalf("expected 1, got %d", len(got.Messages))
	}
}

func TestUpdateToolConfig(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	err := m.UpdateToolConfig(conv.ID, []string{"github"}, []string{"delete_repo"})
	if err != nil {
		t.Fatal(err)
	}

	got := m.Get(conv.ID)
	if len(got.EnabledSources) != 1 || got.EnabledSources[0] != "github" {
		t.Errorf("enabled_sources = %v", got.EnabledSources)
	}
	if len(got.DisabledTools) != 1 || got.DisabledTools[0] != "delete_repo" {
		t.Errorf("disabled_tools = %v", got.DisabledTools)
	}
}

func TestToolConfigInherited(t *testing.T) {
	m := NewManager("")
	conv1 := m.Create("first", "")
	m.UpdateToolConfig(conv1.ID, []string{"github"}, []string{"delete_repo"})

	conv2 := m.Create("second", "")
	if len(conv2.EnabledSources) != 1 || conv2.EnabledSources[0] != "github" {
		t.Errorf("should inherit enabled_sources, got %v", conv2.EnabledSources)
	}
}

func TestEditMessageOutOfBounds(t *testing.T) {
	m := NewManager("")
	conv := m.Create("test", "")
	err := m.EditMessage(conv.ID, 5, "x")
	if err == nil {
		t.Fatal("expected error for out of bounds")
	}
}

func TestEditMessageNotFound(t *testing.T) {
	m := NewManager("")
	err := m.EditMessage("nonexistent", 0, "x")
	if err == nil {
		t.Fatal("expected error for not found")
	}
}
