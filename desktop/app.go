package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/ZacharyZcR/NLUI/bootstrap"
	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/core/conversation"
	"github.com/ZacharyZcR/NLUI/core/llm"
	"github.com/ZacharyZcR/NLUI/engine"
	"github.com/ZacharyZcR/NLUI/gateway"
	"github.com/ZacharyZcR/NLUI/mcp"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

type App struct {
	ctx              context.Context
	engine           *engine.Engine
	convMgr          *conversation.Manager // survives reinit
	language         string
	ready            bool
	confirmCh        chan bool
	mcpClients       map[string]*mcp.Client
	chatCancel       context.CancelFunc // for stopping active chat
	chatCancelMu     sync.Mutex
	targetDisplayMap map[string]string // sanitized name -> display name
}

type ConversationInfo struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type ProviderInfo struct {
	Name    string   `json:"name"`
	APIBase string   `json:"api_base"`
	Models  []string `json:"models"`
}

func (a *App) configPath() string {
	p, _ := config.GlobalConfigPath()
	return p
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// One-time migration: copy local kelper.yaml to global dir if needed
	globalPath := a.configPath()
	if globalPath != "" {
		if _, err := os.Stat(globalPath); os.IsNotExist(err) {
			if data, err := os.ReadFile("kelper.yaml"); err == nil {
				os.WriteFile(globalPath, data, 0600)
			}
		}
	}

	// Async: don't block Wails UI thread — frontend checks ready state
	go a.initialize()
}

func (a *App) initialize() {
	fmt.Fprintf(os.Stderr, "=== initialize() called ===\n")
	a.ready = false

	// Close previous MCP clients if reinitializing
	for _, c := range a.mcpClients {
		c.Close()
	}
	a.mcpClients = nil

	cfg, err := config.Load(a.configPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		return
	}

	if cfg.LLM.APIBase == "" || cfg.LLM.Model == "" {
		fmt.Fprintf(os.Stderr, "LLM not configured\n")
		return
	}

	fmt.Fprintf(os.Stderr, "Loading %d targets\n", len(cfg.Targets))
	allTools, allEndpoints := bootstrap.DiscoverTools(cfg.Targets, nil)
	fmt.Fprintf(os.Stderr, "Discovered %d tools from targets\n", len(allTools))

	// Build target display name mapping from endpoints
	a.targetDisplayMap = make(map[string]string)
	for _, ep := range allEndpoints {
		if ep.TargetDisplayName != "" && ep.TargetName != "" {
			a.targetDisplayMap[ep.TargetName] = ep.TargetDisplayName
		}
	}

	mcpClients, mcpTools := bootstrap.InitMCPClients(cfg.MCP.Clients)
	allTools = append(allTools, mcpTools...)
	a.mcpClients = mcpClients

	router := &bootstrap.Router{
		HttpCaller: gateway.NewCaller(allEndpoints),
		McpClients: mcpClients,
	}

	llmClient := llm.NewClient(cfg.LLM.APIBase, cfg.LLM.APIKey, cfg.LLM.Model, cfg.Proxy)
	a.language = cfg.Language

	convDir := ""
	if dir, err := config.GlobalDir(); err == nil {
		convDir = filepath.Join(dir, "conversations")
	}
	if a.convMgr == nil {
		a.convMgr = conversation.NewManager(convDir)
	}

	a.confirmCh = make(chan bool, 1)

	eng := engine.New(engine.Config{
		LLM:          llmClient,
		Executor:     router,
		Tools:        allTools,
		SystemPrompt: bootstrap.BuildSystemPrompt(cfg.Language, cfg.Targets, allTools),
		MaxCtxTokens: cfg.LLM.MaxCtxTokens,
		ConvMgr:      a.convMgr,
	})
	a.engine = eng
	a.ready = true

	fmt.Fprintf(os.Stderr, "NLUI ready: %d tools\n", len(allTools))

	// Notify frontend that tools have been updated
	wailsRuntime.EventsEmit(a.ctx, "tools-updated", map[string]interface{}{
		"count": len(allTools),
	})
}

// ProbeProviders auto-detects local LLM services and lists cloud presets.
func (a *App) ProbeProviders() []ProviderInfo {
	// Cloud presets — models fetched via FetchModels after user provides API key
	result := []ProviderInfo{
		{Name: "OpenAI", APIBase: "https://api.openai.com/v1", Models: []string{}},
		{Name: "Gemini", APIBase: "https://generativelanguage.googleapis.com/v1beta/openai", Models: []string{}},
		{Name: "DeepSeek", APIBase: "https://api.deepseek.com/v1", Models: []string{}},
		{Name: "Claude", APIBase: "https://api.anthropic.com/v1", Models: []string{}},
	}

	// Auto-detect local services
	type probe struct {
		name    string
		apiBase string
	}
	locals := []probe{
		{"Ollama", "http://localhost:11434/v1"},
		{"LM Studio", "http://localhost:1234/v1"},
	}

	client := &http.Client{Timeout: 2 * time.Second}
	for _, t := range locals {
		models := fetchModels(client, t.apiBase+"/models")
		if len(models) > 0 {
			// Local services go first
			result = append([]ProviderInfo{{
				Name:    t.name,
				APIBase: t.apiBase,
				Models:  models,
			}}, result...)
		}
	}
	return result
}

// FetchModels queries /v1/models for any OpenAI-compatible endpoint.
func (a *App) FetchModels(apiBase, apiKey string) []string {
	client := a.proxyHTTPClient(5 * time.Second)
	u := strings.TrimRight(apiBase, "/") + "/models"

	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil
	}
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	return parseModelsResponse(resp)
}

// proxyHTTPClient returns an http.Client that uses the configured proxy (if any).
func (a *App) proxyHTTPClient(timeout time.Duration) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if cfg, err := config.Load(a.configPath()); err == nil && cfg.Proxy != "" {
		if proxyURL, err := url.Parse(cfg.Proxy); err == nil {
			transport.Proxy = http.ProxyURL(proxyURL)
		}
	}
	return &http.Client{Timeout: timeout, Transport: transport}
}

func fetchModels(client *http.Client, url string) []string {
	resp, err := client.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	return parseModelsResponse(resp)
}

func parseModelsResponse(resp *http.Response) []string {
	if resp.StatusCode != 200 {
		return nil
	}
	var body struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if json.NewDecoder(resp.Body).Decode(&body) != nil {
		return nil
	}
	var models []string
	for _, m := range body.Data {
		models = append(models, m.ID)
	}
	return models
}

// SaveLLMConfig writes LLM settings to kelper.yaml and reinitializes.
func (a *App) SaveLLMConfig(apiBase, apiKey, model string) string {
	cfg := &config.Config{}
	if existing, err := config.Load(a.configPath()); err == nil {
		cfg = existing
	}

	cfg.LLM.APIBase = apiBase
	cfg.LLM.APIKey = apiKey
	cfg.LLM.Model = model

	if cfg.Language == "" {
		cfg.Language = "en"
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 9000
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err.Error()
	}
	if err := os.WriteFile(a.configPath(), data, 0600); err != nil {
		return err.Error()
	}

	a.initialize()
	return ""
}

// GetCurrentConfig returns the current LLM configuration.
func (a *App) GetCurrentConfig() map[string]interface{} {
	cfg, err := config.Load(a.configPath())
	if err != nil {
		return map[string]interface{}{"exists": false}
	}
	toolCount := 0
	if a.engine != nil {
		toolCount = len(a.engine.Tools())
	}
	return map[string]interface{}{
		"exists":   true,
		"api_base": cfg.LLM.APIBase,
		"api_key":  cfg.LLM.APIKey, // Desktop app: return full key for editing
		"model":    cfg.LLM.Model,
		"language": cfg.Language,
		"proxy":    cfg.Proxy,
		"ready":    a.ready,
		"tools":    toolCount,
	}
}

// TestProxy tests connectivity through the given proxy by hitting https://www.google.com.
func (a *App) TestProxy(proxy string) string {
	if proxy == "" {
		return "no proxy configured"
	}
	proxyURL, err := url.Parse(proxy)
	if err != nil {
		return "invalid proxy URL: " + err.Error()
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = http.ProxyURL(proxyURL)
	client := &http.Client{Timeout: 10 * time.Second, Transport: transport}

	resp, err := client.Get("https://www.google.com")
	if err != nil {
		return err.Error()
	}
	resp.Body.Close()
	return ""
}

// SaveProxy writes the proxy setting to kelper.yaml (no reinit needed).
func (a *App) SaveProxy(proxy string) string {
	cfg := &config.Config{}
	if existing, err := config.Load(a.configPath()); err == nil {
		cfg = existing
	}
	cfg.Proxy = proxy
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err.Error()
	}
	if err := os.WriteFile(a.configPath(), data, 0600); err != nil {
		return err.Error()
	}
	return ""
}

// UploadSpec opens a file dialog for the user to pick a .json/.yaml OpenAPI spec.
func (a *App) UploadSpec() map[string]interface{} {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select OpenAPI Spec",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "OpenAPI Spec (*.json;*.yaml;*.yml)", Pattern: "*.json;*.yaml;*.yml"},
		},
	})
	if err != nil || path == "" {
		return map[string]interface{}{"found": false, "error": "no file selected"}
	}

	doc, err := gateway.LoadSpec(path)
	if err != nil {
		return map[string]interface{}{"found": false, "error": err.Error()}
	}

	auth := gateway.AuthConfig{}
	tools, _ := gateway.BuildTools(doc, "_upload", "", auth)
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	return map[string]interface{}{
		"found":     true,
		"spec_url":  path,
		"tools":     len(tools),
		"endpoints": endpoints,
	}
}

// UploadToolSet opens a file dialog for the user to pick a ToolSet JSON file.
func (a *App) UploadToolSet() map[string]interface{} {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select ToolSet JSON",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "ToolSet JSON (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil || path == "" {
		return map[string]interface{}{"found": false, "error": "no file selected"}
	}

	ts, err := gateway.LoadToolSet(path)
	if err != nil {
		return map[string]interface{}{"found": false, "error": err.Error()}
	}

	endpoints := make([]string, 0, len(ts.Endpoints))
	for _, ep := range ts.Endpoints {
		endpoints = append(endpoints, ep.Name+": "+ep.Description)
	}

	return map[string]interface{}{
		"found":      true,
		"tools_path": path,
		"tools":      len(ts.Endpoints),
		"endpoints":  endpoints,
	}
}

// ProbeTarget tries to discover an OpenAPI spec from a base URL.
func (a *App) ProbeTarget(baseURL string) map[string]interface{} {
	doc, specURL, err := gateway.DiscoverSpec(baseURL)
	if err != nil {
		return map[string]interface{}{
			"found": false,
			"error": err.Error(),
		}
	}

	auth := gateway.AuthConfig{}
	tools, _ := gateway.BuildTools(doc, "_probe", baseURL, auth)
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	return map[string]interface{}{
		"found":     true,
		"spec_url":  specURL,
		"tools":     len(tools),
		"endpoints": endpoints,
	}
}

// ListTargets returns the configured API targets with tool counts.
func (a *App) ListTargets() []map[string]interface{} {
	cfg, err := config.Load(a.configPath())
	if err != nil {
		return []map[string]interface{}{}
	}

	result := make([]map[string]interface{}, 0)
	for _, tgt := range cfg.Targets {
		toolCount := 0
		source := tgt.Spec // what to show in "spec" field

		// Try cached/explicit toolset first (fast path, no parsing)
		if ts := loadTargetToolSet(tgt); ts != nil {
			toolCount = len(ts.Endpoints)
			if source == "" {
				source = tgt.Tools
			}
		}

		result = append(result, map[string]interface{}{
			"name":        tgt.Name,
			"base_url":    tgt.BaseURL,
			"spec":        source,
			"auth_type":   tgt.Auth.Type,
			"description": tgt.Description,
			"tools":       toolCount,
		})
	}
	return result
}

// loadTargetToolSet tries to load toolset from explicit path or cache.
func loadTargetToolSet(tgt config.Target) *gateway.ToolSet {
	// 1. Explicit toolset file
	if tgt.Tools != "" {
		ts, err := gateway.LoadToolSet(tgt.Tools)
		if err == nil {
			return ts
		}
	}
	// 2. Cached toolset from previous bootstrap
	if tsPath, err := config.ToolSetPath(tgt.Name); err == nil {
		ts, err := gateway.LoadToolSet(tsPath)
		if err == nil {
			return ts
		}
	}
	return nil
}

// AddTarget adds a new API target to the config and reinitializes.
func (a *App) AddTarget(name, baseURL, spec, tools, authType, authToken, description string) string {
	if name == "" || (baseURL == "" && spec == "" && tools == "") {
		return "name and (base_url, spec, or tools) are required"
	}

	cfg := &config.Config{}
	if existing, err := config.Load(a.configPath()); err == nil {
		cfg = existing
	}

	// Check for duplicate name
	for _, t := range cfg.Targets {
		if t.Name == name {
			return "target name already exists"
		}
	}

	cfg.Targets = append(cfg.Targets, config.Target{
		Name:        name,
		BaseURL:     baseURL,
		Spec:        spec,
		Tools:       tools,
		Auth:        config.AuthConfig{Type: authType, Token: authToken},
		Description: description,
	})

	if cfg.Language == "" {
		cfg.Language = "en"
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 9000
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err.Error()
	}
	if err := os.WriteFile(a.configPath(), data, 0600); err != nil {
		return err.Error()
	}

	a.initialize()
	return ""
}

// RemoveTarget removes an API target by name and reinitializes.
func (a *App) RemoveTarget(name string) string {
	cfg, err := config.Load(a.configPath())
	if err != nil {
		return err.Error()
	}

	filtered := cfg.Targets[:0]
	for _, t := range cfg.Targets {
		if t.Name != name {
			filtered = append(filtered, t)
		}
	}
	cfg.Targets = filtered

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err.Error()
	}
	if err := os.WriteFile(a.configPath(), data, 0600); err != nil {
		return err.Error()
	}

	if tsPath, err := config.ToolSetPath(name); err == nil {
		os.Remove(tsPath)
	}
	a.initialize()
	return ""
}

func maskKey(key string) string {
	if len(key) <= 8 {
		return key
	}
	return key[:4] + "..." + key[len(key)-4:]
}

func (a *App) Chat(message, conversationID string) string {
	if !a.ready {
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": "error",
			"data": map[string]string{"error": "not initialized, check kelper.yaml"},
		})
		return ""
	}

	// Create cancellable context for this chat
	chatCtx, cancel := context.WithCancel(a.ctx)
	a.chatCancelMu.Lock()
	a.chatCancel = cancel
	a.chatCancelMu.Unlock()
	defer func() {
		a.chatCancelMu.Lock()
		a.chatCancel = nil
		a.chatCancelMu.Unlock()
	}()

	confirm := func(toolName, argsJSON string) bool {
		wailsRuntime.EventsEmit(a.ctx, "tool-confirm", map[string]string{
			"name":      toolName,
			"arguments": argsJSON,
		})
		return <-a.confirmCh
	}

	var lastUsage interface{}

	convID, err := a.engine.Chat(chatCtx, conversationID, message, "", confirm, func(event engine.Event) {
		if event.Type == "usage" {
			lastUsage = event.Data
			return
		}
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": event.Type,
			"data": event.Data,
		})
	})

	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": "error",
			"data": map[string]string{"error": err.Error()},
		})
	}

	doneData := map[string]interface{}{
		"conversation_id": convID,
	}
	if lastUsage != nil {
		doneData["usage"] = lastUsage
	}

	wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
		"type": "done",
		"data": doneData,
	})

	return convID
}

func (a *App) ListConversations() []ConversationInfo {
	if !a.ready {
		return []ConversationInfo{}
	}
	convs := a.engine.ListConversations()
	result := make([]ConversationInfo, 0, len(convs))
	for _, c := range convs {
		result = append(result, ConversationInfo{
			ID:        c.ID,
			Title:     c.Title,
			CreatedAt: c.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt: c.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
	return result
}

func (a *App) DeleteConversation(id string) {
	if a.ready {
		a.engine.DeleteConversation(id)
	}
}

// CreateEmptyConversation creates a new conversation without any messages.
// Returns the conversation ID.
func (a *App) CreateEmptyConversation() string {
	if !a.ready {
		return ""
	}
	conv := a.engine.CreateConversation("")
	return conv.ID
}

// ChatMessage is a frontend-friendly message format.
type ChatMessage struct {
	ID       string `json:"id"`
	Role     string `json:"role"`
	Content  string `json:"content"`
	ToolName string `json:"tool_name,omitempty"`
	ToolArgs string `json:"tool_args,omitempty"`
}

// GetConversationMessages returns messages for a conversation in frontend format.
func (a *App) GetConversationMessages(id string) []ChatMessage {
	if !a.ready || id == "" {
		return []ChatMessage{}
	}
	conv := a.engine.GetConversation(id)
	if conv == nil {
		return []ChatMessage{}
	}
	var result []ChatMessage
	seq := 0
	for _, m := range conv.Messages {
		switch m.Role {
		case "system":
			continue
		case "user":
			seq++
			result = append(result, ChatMessage{
				ID:      fmt.Sprintf("hist-%d", seq),
				Role:    "user",
				Content: m.Content,
			})
		case "assistant":
			if m.Content != "" {
				seq++
				result = append(result, ChatMessage{
					ID:      fmt.Sprintf("hist-%d", seq),
					Role:    "assistant",
					Content: m.Content,
				})
			}
			for _, tc := range m.ToolCalls {
				seq++
				result = append(result, ChatMessage{
					ID:       fmt.Sprintf("hist-%d", seq),
					Role:     "tool_call",
					ToolName: tc.Function.Name,
					ToolArgs: tc.Function.Arguments,
				})
			}
		case "tool":
			seq++
			result = append(result, ChatMessage{
				ID:       fmt.Sprintf("hist-%d", seq),
				Role:     "tool_result",
				Content:  m.Content,
				ToolName: m.ToolCallID,
			})
		}
	}
	return result
}

// ConfirmTool is called by the frontend to approve/reject a dangerous tool call.
func (a *App) ConfirmTool(approved bool) {
	select {
	case a.confirmCh <- approved:
	default:
	}
}

// ToolInfo describes a single tool for the frontend.
type ToolInfo struct {
	TargetName  string      `json:"target_name"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters"`
}

// ListTools returns all loaded tools with target grouping.
func (a *App) ListTools() []ToolInfo {
	if a.engine == nil {
		return []ToolInfo{}
	}
	result := make([]ToolInfo, 0)
	for _, t := range a.engine.Tools() {
		targetName := ""
		funcName := t.Function.Name
		if parts := strings.SplitN(t.Function.Name, "__", 2); len(parts) == 2 {
			targetName = parts[0]
			funcName = parts[1]
		}

		// Use display name if available
		displayName := targetName
		if a.targetDisplayMap != nil {
			if dn, ok := a.targetDisplayMap[targetName]; ok {
				displayName = dn
			}
		}

		result = append(result, ToolInfo{
			TargetName:  displayName, // Use display name instead of sanitized name
			Name:        funcName,
			Description: t.Function.Description,
			Parameters:  t.Function.Parameters,
		})
	}
	return result
}

// GetConfigDir returns the global config directory path.
func (a *App) GetConfigDir() string {
	dir, _ := config.GlobalDir()
	return dir
}

func (a *App) GetInfo() map[string]interface{} {
	toolCount := 0
	if a.engine != nil {
		toolCount = len(a.engine.Tools())
	}
	return map[string]interface{}{
		"language": a.language,
		"tools":    toolCount,
		"ready":    a.ready,
	}
}

// StopChat cancels the current active chat if any.
func (a *App) StopChat() {
	a.chatCancelMu.Lock()
	defer a.chatCancelMu.Unlock()
	if a.chatCancel != nil {
		a.chatCancel()
	}
}

// EditMessage edits a message at the given index and regenerates from that point.
// Frontend must convert message display index to actual Messages array index.
func (a *App) EditMessage(convID string, msgIndex int, newContent string) string {
	if !a.ready {
		return "not ready"
	}

	chatCtx, cancel := context.WithCancel(a.ctx)
	a.chatCancelMu.Lock()
	a.chatCancel = cancel
	a.chatCancelMu.Unlock()
	defer func() {
		a.chatCancelMu.Lock()
		a.chatCancel = nil
		a.chatCancelMu.Unlock()
	}()

	confirm := func(toolName, argsJSON string) bool {
		wailsRuntime.EventsEmit(a.ctx, "tool-confirm", map[string]string{
			"name":      toolName,
			"arguments": argsJSON,
		})
		return <-a.confirmCh
	}

	var lastUsage interface{}
	err := a.engine.EditMessageAndRegenerate(chatCtx, convID, msgIndex, newContent, "", confirm, func(event engine.Event) {
		if event.Type == "usage" {
			lastUsage = event.Data
			return
		}
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": event.Type,
			"data": event.Data,
		})
	})

	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": "error",
			"data": map[string]string{"error": err.Error()},
		})
		return err.Error()
	}

	doneData := map[string]interface{}{
		"conversation_id": convID,
	}
	if lastUsage != nil {
		doneData["usage"] = lastUsage
	}
	wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
		"type": "done",
		"data": doneData,
	})
	return ""
}

// DeleteMessagesFrom deletes messages starting from the given index.
func (a *App) DeleteMessagesFrom(convID string, msgIndex int) string {
	if !a.ready {
		return "not ready"
	}
	if err := a.engine.DeleteMessagesFrom(convID, msgIndex); err != nil {
		return err.Error()
	}
	return ""
}

// DeleteMessage deletes a single message at the given frontend display index.
// For assistant messages with tool calls, deletes the entire conversation turn
// (assistant + all subsequent tool results).
func (a *App) DeleteMessage(convID string, frontendIndex int) string {
	if !a.ready {
		return "not ready"
	}
	conv := a.engine.GetConversation(convID)
	if conv == nil {
		return "conversation not found"
	}

	// Build frontend → backend index mapping
	frontendIdx := 0
	targetBackendIdx := -1
	targetMsg := (*llm.Message)(nil)

	for i, m := range conv.Messages {
		if m.Role == "system" {
			continue
		}

		msgStart := frontendIdx
		msgCount := 0

		switch m.Role {
		case "user":
			msgCount = 1
		case "assistant":
			if m.Content != "" {
				msgCount++
			}
			msgCount += len(m.ToolCalls)
		case "tool":
			msgCount = 1
		}

		// Check if frontendIndex falls within this backend message's range
		if frontendIndex >= msgStart && frontendIndex < msgStart+msgCount {
			targetBackendIdx = i
			targetMsg = &conv.Messages[i]
			break
		}

		frontendIdx += msgCount
	}

	if targetBackendIdx == -1 {
		return "invalid message index"
	}

	// Determine what to delete based on message type
	deleteStart := targetBackendIdx
	deleteEnd := targetBackendIdx

	if targetMsg.Role == "assistant" && len(targetMsg.ToolCalls) > 0 {
		// Delete assistant + all subsequent tool results
		toolCallIDs := make(map[string]bool)
		for _, tc := range targetMsg.ToolCalls {
			toolCallIDs[tc.ID] = true
		}

		// Find all subsequent tool messages that match these tool call IDs
		for i := targetBackendIdx + 1; i < len(conv.Messages); i++ {
			if conv.Messages[i].Role == "tool" && toolCallIDs[conv.Messages[i].ToolCallID] {
				deleteEnd = i
				delete(toolCallIDs, conv.Messages[i].ToolCallID)
			} else if conv.Messages[i].Role != "tool" {
				// Stop at the next non-tool message
				break
			}
		}
	} else if targetMsg.Role == "tool" {
		// Deleting a tool result - find and delete the assistant that triggered it
		toolCallID := targetMsg.ToolCallID
		for i := targetBackendIdx - 1; i >= 0; i-- {
			if conv.Messages[i].Role == "assistant" {
				// Check if this assistant has the matching tool call
				for _, tc := range conv.Messages[i].ToolCalls {
					if tc.ID == toolCallID {
						deleteStart = i
						// Also delete all tool results for this assistant
						for _, otherTC := range conv.Messages[i].ToolCalls {
							for j := i + 1; j < len(conv.Messages); j++ {
								if conv.Messages[j].Role == "tool" && conv.Messages[j].ToolCallID == otherTC.ID {
									if j > deleteEnd {
										deleteEnd = j
									}
								}
							}
						}
						break
					}
				}
				break
			}
		}
	}
	// For user messages or assistant messages without tool calls, just delete that single message

	// Delete the range [deleteStart, deleteEnd]
	if deleteEnd > deleteStart {
		// We need to delete a range, not just from a point
		// Rebuild the message list excluding [deleteStart, deleteEnd]
		newMessages := append([]llm.Message{}, conv.Messages[:deleteStart]...)
		if deleteEnd+1 < len(conv.Messages) {
			newMessages = append(newMessages, conv.Messages[deleteEnd+1:]...)
		}
		a.convMgr.UpdateMessages(convID, newMessages)
		return ""
	}

	// Single message deletion
	if err := a.engine.DeleteMessage(convID, deleteStart); err != nil {
		return err.Error()
	}
	return ""
}

// UpdateToolConfig updates the tool configuration for a conversation.
func (a *App) UpdateToolConfig(convID string, enabledSources, disabledTools []string) string {
	if !a.ready {
		return "not ready"
	}

	// Map display names back to sanitized names for internal use
	sanitizedSources := make([]string, 0, len(enabledSources))
	if a.targetDisplayMap != nil {
		// Build reverse map: display name -> sanitized name
		reverseMap := make(map[string]string)
		for sanitized, display := range a.targetDisplayMap {
			reverseMap[display] = sanitized
		}

		for _, displayName := range enabledSources {
			if sanitized, ok := reverseMap[displayName]; ok {
				sanitizedSources = append(sanitizedSources, sanitized)
			} else {
				// Already sanitized or unknown, keep as-is
				sanitizedSources = append(sanitizedSources, displayName)
			}
		}
	} else {
		sanitizedSources = enabledSources
	}

	if err := a.engine.UpdateToolConfig(convID, sanitizedSources, disabledTools); err != nil {
		return err.Error()
	}
	return ""
}

// GetToolConfig returns the tool configuration for a conversation.
type ToolConfig struct {
	EnabledSources []string `json:"enabled_sources"`
	DisabledTools  []string `json:"disabled_tools"`
}

func (a *App) GetToolConfig(convID string) ToolConfig {
	if a.engine == nil || convID == "" {
		return ToolConfig{
			EnabledSources: []string{},
			DisabledTools:  []string{},
		}
	}
	conv := a.engine.GetConversation(convID)
	if conv == nil {
		return ToolConfig{
			EnabledSources: []string{},
			DisabledTools:  []string{},
		}
	}
	// Ensure slices are never nil (JSON null) for frontend
	enabledSources := conv.EnabledSources
	if enabledSources == nil {
		enabledSources = []string{}
	}
	disabledTools := conv.DisabledTools
	if disabledTools == nil {
		disabledTools = []string{}
	}

	// Map sanitized source names to display names for frontend
	displaySources := make([]string, 0, len(enabledSources))
	if a.targetDisplayMap != nil {
		for _, sanitized := range enabledSources {
			if display, ok := a.targetDisplayMap[sanitized]; ok {
				displaySources = append(displaySources, display)
			} else {
				// Unknown or already display name
				displaySources = append(displaySources, sanitized)
			}
		}
	} else {
		displaySources = enabledSources
	}

	return ToolConfig{
		EnabledSources: displaySources,
		DisabledTools:  disabledTools,
	}
}

// GetAvailableSources returns all available tool sources (MCP clients + API targets).
func (a *App) GetAvailableSources() []SourceInfo {
	if a.engine == nil {
		return []SourceInfo{}
	}

	sourcesMap := make(map[string]*SourceInfo)

	for _, tool := range a.engine.Tools() {
		toolName := tool.Function.Name
		source := "default"
		displayName := toolName

		if idx := strings.Index(toolName, "__"); idx > 0 {
			source = toolName[:idx]
			displayName = toolName[idx+2:]
		}

		// Skip temporary tools (_upload, _probe)
		if strings.HasPrefix(source, "_") {
			continue
		}

		// Map sanitized source name to display name
		sourceDisplayName := source
		if a.targetDisplayMap != nil {
			if dn, ok := a.targetDisplayMap[source]; ok {
				sourceDisplayName = dn
			}
		}

		if _, exists := sourcesMap[sourceDisplayName]; !exists {
			sourcesMap[sourceDisplayName] = &SourceInfo{
				Name:  sourceDisplayName,
				Tools: []ToolSummary{},
			}
		}

		sourcesMap[sourceDisplayName].Tools = append(sourcesMap[sourceDisplayName].Tools, ToolSummary{
			Name:        toolName,
			DisplayName: displayName,
			Description: tool.Function.Description,
		})
	}

	result := make([]SourceInfo, 0, len(sourcesMap))
	for _, src := range sourcesMap {
		result = append(result, *src)
	}
	fmt.Fprintf(os.Stderr, "GetAvailableSources: %d sources, %d total tools\n", len(result), len(a.engine.Tools()))
	return result
}

type SourceInfo struct {
	Name  string        `json:"name"`
	Tools []ToolSummary `json:"tools"`
}

type ToolSummary struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
}

// RegenerateFrom regenerates from a specific message index (for retry).
func (a *App) RegenerateFrom(convID string, fromIndex int) string {
	if !a.ready {
		return "not ready"
	}

	chatCtx, cancel := context.WithCancel(a.ctx)
	a.chatCancelMu.Lock()
	a.chatCancel = cancel
	a.chatCancelMu.Unlock()
	defer func() {
		a.chatCancelMu.Lock()
		a.chatCancel = nil
		a.chatCancelMu.Unlock()
	}()

	confirm := func(toolName, argsJSON string) bool {
		wailsRuntime.EventsEmit(a.ctx, "tool-confirm", map[string]string{
			"name":      toolName,
			"arguments": argsJSON,
		})
		return <-a.confirmCh
	}

	var lastUsage interface{}
	err := a.engine.RegenerateFrom(chatCtx, convID, fromIndex, "", confirm, func(event engine.Event) {
		if event.Type == "usage" {
			lastUsage = event.Data
			return
		}
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": event.Type,
			"data": event.Data,
		})
	})

	if err != nil {
		wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
			"type": "error",
			"data": map[string]string{"error": err.Error()},
		})
		return err.Error()
	}

	doneData := map[string]interface{}{
		"conversation_id": convID,
	}
	if lastUsage != nil {
		doneData["usage"] = lastUsage
	}
	wailsRuntime.EventsEmit(a.ctx, "chat-event", map[string]interface{}{
		"type": "done",
		"data": doneData,
	})
	return ""
}

// SetWindowTitle dynamically sets the window title (for i18n support).
func (a *App) SetWindowTitle(title string) {
	wailsRuntime.WindowSetTitle(a.ctx, title)
}
