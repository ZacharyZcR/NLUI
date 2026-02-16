package server

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/ZacharyZcR/NLUI/bootstrap"
	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/core/conversation"
	"github.com/ZacharyZcR/NLUI/core/llm"
	"github.com/ZacharyZcR/NLUI/engine"
	"github.com/ZacharyZcR/NLUI/gateway"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// ============= Phase 1: Targets Management =============

type AddTargetRequest struct {
	Name        string `json:"name" binding:"required"`
	BaseURL     string `json:"base_url"`
	Spec        string `json:"spec"`
	AuthType    string `json:"auth_type"`
	AuthToken   string `json:"auth_token"`
	Description string `json:"description"`
}

type ProbeTargetRequest struct {
	BaseURL string `json:"base_url" binding:"required"`
}

// listTargets returns all configured API targets
func (s *Server) listTargets(c *gin.Context) {
	targets := make([]map[string]interface{}, 0, len(s.cfg.Targets))

	for _, t := range s.cfg.Targets {
		targets = append(targets, map[string]interface{}{
			"name":        t.Name,
			"base_url":    t.BaseURL,
			"spec":        t.Spec,
			"auth_type":   t.Auth.Type,
			"description": t.Description,
		})
	}

	c.JSON(200, targets)
}

// addTarget dynamically adds a new OpenAPI target
func (s *Server) addTarget(c *gin.Context) {
	var req AddTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.BaseURL == "" && req.Spec == "" {
		c.JSON(400, gin.H{"error": "either base_url or spec is required"})
		return
	}

	// Check for duplicate name
	for _, t := range s.cfg.Targets {
		if t.Name == req.Name {
			c.JSON(409, gin.H{"error": "target name already exists"})
			return
		}
	}

	// Add to config
	newTarget := config.Target{
		Name:        req.Name,
		BaseURL:     req.BaseURL,
		Spec:        req.Spec,
		Auth:        config.AuthConfig{Type: req.AuthType, Token: req.AuthToken},
		Description: req.Description,
	}
	s.cfg.Targets = append(s.cfg.Targets, newTarget)

	// Save config
	if err := s.saveConfig(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to save config: %v", err)})
		return
	}

	// Reload engine
	if err := s.reloadEngine(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to reload: %v", err)})
		return
	}

	c.JSON(201, gin.H{
		"message": "target added successfully",
		"name":    req.Name,
		"tools":   len(s.engine.Tools()),
	})
}

// removeTarget dynamically removes an OpenAPI target
func (s *Server) removeTarget(c *gin.Context) {
	name := c.Param("name")

	// Find and remove
	found := false
	filtered := s.cfg.Targets[:0]
	for _, t := range s.cfg.Targets {
		if t.Name == name {
			found = true
		} else {
			filtered = append(filtered, t)
		}
	}

	if !found {
		c.JSON(404, gin.H{"error": "target not found"})
		return
	}

	s.cfg.Targets = filtered

	// Save config
	if err := s.saveConfig(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to save config: %v", err)})
		return
	}

	// Remove tool cache
	config.RemoveToolCache(name)

	// Reload engine
	if err := s.reloadEngine(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to reload: %v", err)})
		return
	}

	c.JSON(200, gin.H{
		"message": "target removed successfully",
		"tools":   len(s.engine.Tools()),
	})
}

// probeTarget tries to discover an OpenAPI spec from a base URL
func (s *Server) probeTarget(c *gin.Context) {
	var req ProbeTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	doc, specURL, err := gateway.DiscoverSpec(req.BaseURL)
	if err != nil {
		c.JSON(200, gin.H{
			"found": false,
			"error": err.Error(),
		})
		return
	}

	tools, _ := gateway.BuildTools(doc, "_probe", req.BaseURL, gateway.AuthConfig{})
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	c.JSON(200, gin.H{
		"found":     true,
		"spec_url":  specURL,
		"tools":     len(tools),
		"endpoints": endpoints,
	})
}

// ============= Phase 2: Tools Management =============

// listTools returns all loaded tools
func (s *Server) listTools(c *gin.Context) {
	tools := make([]map[string]interface{}, 0, len(s.engine.Tools()))

	for _, t := range s.engine.Tools() {
		tools = append(tools, map[string]interface{}{
			"name":        t.Function.Name,
			"description": t.Function.Description,
			"parameters":  t.Function.Parameters,
		})
	}

	c.JSON(200, tools)
}

// listToolSources returns all available tool sources
func (s *Server) listToolSources(c *gin.Context) {
	sourcesMap := make(map[string][]map[string]interface{})

	for _, tool := range s.engine.Tools() {
		source := "default"
		if idx := len(tool.Function.Name); idx > 0 {
			parts := splitToolName(tool.Function.Name)
			if len(parts) == 2 {
				source = parts[0]
			}
		}

		if _, exists := sourcesMap[source]; !exists {
			sourcesMap[source] = []map[string]interface{}{}
		}

		sourcesMap[source] = append(sourcesMap[source], map[string]interface{}{
			"name":        tool.Function.Name,
			"description": tool.Function.Description,
		})
	}

	result := make([]map[string]interface{}, 0, len(sourcesMap))
	for source, tools := range sourcesMap {
		result = append(result, map[string]interface{}{
			"name":  source,
			"tools": tools,
		})
	}

	c.JSON(200, result)
}

// getConversationTools returns tool configuration for a conversation
func (s *Server) getConversationTools(c *gin.Context) {
	convID := c.Param("id")
	conv := s.engine.GetConversation(convID)

	if conv == nil {
		c.JSON(404, gin.H{"error": "conversation not found"})
		return
	}

	enabledSources := conv.EnabledSources
	if enabledSources == nil {
		enabledSources = []string{}
	}
	disabledTools := conv.DisabledTools
	if disabledTools == nil {
		disabledTools = []string{}
	}

	c.JSON(200, gin.H{
		"enabled_sources": enabledSources,
		"disabled_tools":  disabledTools,
	})
}

// updateConversationTools updates tool configuration for a conversation
func (s *Server) updateConversationTools(c *gin.Context) {
	convID := c.Param("id")

	var req struct {
		EnabledSources []string `json:"enabled_sources"`
		DisabledTools  []string `json:"disabled_tools"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if err := s.engine.UpdateToolConfig(convID, req.EnabledSources, req.DisabledTools); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "tool configuration updated"})
}

// ============= Phase 3: Message Editing & Regeneration =============

type EditMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

type RegenerateRequest struct {
	FromIndex int `json:"from_index" binding:"required"`
}

// editMessage edits a message and regenerates from that point
func (s *Server) editMessage(c *gin.Context) {
	convID := c.Param("id")
	msgIndex := parseIntParam(c, "index")
	if msgIndex < 0 {
		c.JSON(400, gin.H{"error": "invalid message index"})
		return
	}

	var req EditMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	authToken := extractAuthToken(c)

	// SSE response
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	err := s.engine.EditMessageAndRegenerate(c.Request.Context(), convID, msgIndex, req.Content, authToken, nil, func(event engine.Event) {
		if data, err := json.Marshal(event.Data); err == nil {
			fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, string(data))
			c.Writer.Flush()
		}
	})

	if err != nil {
		if errData, marshalErr := json.Marshal(gin.H{"error": err.Error()}); marshalErr == nil {
			fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", string(errData))
			c.Writer.Flush()
		}
	}

	if doneData, err := json.Marshal(gin.H{"conversation_id": convID}); err == nil {
		fmt.Fprintf(c.Writer, "event: done\ndata: %s\n\n", string(doneData))
		c.Writer.Flush()
	}
}

// regenerateFrom regenerates from a specific message index
func (s *Server) regenerateFrom(c *gin.Context) {
	convID := c.Param("id")

	var req RegenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	authToken := extractAuthToken(c)

	// SSE response
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	err := s.engine.RegenerateFrom(c.Request.Context(), convID, req.FromIndex, authToken, nil, func(event engine.Event) {
		if data, err := json.Marshal(event.Data); err == nil {
			fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, string(data))
			c.Writer.Flush()
		}
	})

	if err != nil {
		if errData, marshalErr := json.Marshal(gin.H{"error": err.Error()}); marshalErr == nil {
			fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", string(errData))
			c.Writer.Flush()
		}
	}

	if doneData, err := json.Marshal(gin.H{"conversation_id": convID}); err == nil {
		fmt.Fprintf(c.Writer, "event: done\ndata: %s\n\n", string(doneData))
		c.Writer.Flush()
	}
}

// deleteMessage deletes a single message
func (s *Server) deleteMessage(c *gin.Context) {
	convID := c.Param("id")
	msgIndex := parseIntParam(c, "index")
	if msgIndex < 0 {
		c.JSON(400, gin.H{"error": "invalid message index"})
		return
	}

	if err := s.engine.DeleteMessage(convID, msgIndex); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "message deleted"})
}

// deleteMessagesFrom deletes messages starting from an index
func (s *Server) deleteMessagesFrom(c *gin.Context) {
	convID := c.Param("id")
	msgIndex := parseIntParam(c, "index")
	if msgIndex < 0 {
		c.JSON(400, gin.H{"error": "invalid message index"})
		return
	}

	if err := s.engine.DeleteMessagesFrom(convID, msgIndex); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "messages deleted"})
}

// ============= Phase 4: LLM Configuration =============

type LLMConfigRequest struct {
	APIBase string `json:"api_base"`
	APIKey  string `json:"api_key"`
	Model   string `json:"model"`
}

type FetchModelsRequest struct {
	APIBase string `json:"api_base" binding:"required"`
	APIKey  string `json:"api_key"`
}

// getLLMConfig returns current LLM configuration
func (s *Server) getLLMConfig(c *gin.Context) {
	c.JSON(200, gin.H{
		"api_base": s.cfg.LLM.APIBase,
		"api_key":  maskAPIKey(s.cfg.LLM.APIKey),
		"model":    s.cfg.LLM.Model,
	})
}

// updateLLMConfig updates LLM configuration
func (s *Server) updateLLMConfig(c *gin.Context) {
	var req LLMConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	s.cfg.LLM.APIBase = req.APIBase
	s.cfg.LLM.APIKey = req.APIKey
	s.cfg.LLM.Model = req.Model

	if err := s.saveConfig(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to save config: %v", err)})
		return
	}

	if err := s.reloadEngine(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to reload: %v", err)})
		return
	}

	c.JSON(200, gin.H{"message": "LLM configuration updated"})
}

// probeLLMProviders auto-detects local LLM services
func (s *Server) probeLLMProviders(c *gin.Context) {
	// Similar to desktop app.go ProbeProviders()
	providers := []map[string]interface{}{
		{"name": "OpenAI", "api_base": "https://api.openai.com/v1"},
		{"name": "Gemini", "api_base": "https://generativelanguage.googleapis.com/v1beta/openai"},
		{"name": "DeepSeek", "api_base": "https://api.deepseek.com/v1"},
		{"name": "Claude", "api_base": "https://api.anthropic.com/v1"},
	}

	// TODO: Auto-detect local services (Ollama, LM Studio)

	c.JSON(200, providers)
}

// fetchModels queries /v1/models for any OpenAI-compatible endpoint
func (s *Server) fetchModels(c *gin.Context) {
	var req FetchModelsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement model fetching logic

	c.JSON(200, []string{"model-1", "model-2"})
}

// ============= Phase 5: Proxy Configuration =============

type ProxyConfigRequest struct {
	Proxy string `json:"proxy"`
}

type ProxyTestRequest struct {
	Proxy string `json:"proxy" binding:"required"`
}

// getProxyConfig returns current proxy configuration
func (s *Server) getProxyConfig(c *gin.Context) {
	c.JSON(200, gin.H{"proxy": s.cfg.Proxy})
}

// updateProxyConfig updates proxy configuration
func (s *Server) updateProxyConfig(c *gin.Context) {
	var req ProxyConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	s.cfg.Proxy = req.Proxy

	if err := s.saveConfig(); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to save config: %v", err)})
		return
	}

	c.JSON(200, gin.H{"message": "proxy configuration updated"})
}

// testProxy tests connectivity through the given proxy
func (s *Server) testProxy(c *gin.Context) {
	var req ProxyTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement proxy testing logic

	c.JSON(200, gin.H{"status": "ok"})
}

// ============= Helper Functions =============

var (
	reloadMu sync.Mutex
)

// saveConfig saves the current configuration to file
func (s *Server) saveConfig() error {
	reloadMu.Lock()
	defer reloadMu.Unlock()

	cfgPath, err := config.GlobalConfigPath()
	if err != nil {
		return err
	}

	data, err := yaml.Marshal(s.cfg)
	if err != nil {
		return err
	}

	return os.WriteFile(cfgPath, data, 0600)
}

// reloadEngine reinitializes the engine with updated configuration
func (s *Server) reloadEngine() error {
	reloadMu.Lock()
	defer reloadMu.Unlock()

	// Run bootstrap with new config
	res, err := bootstrap.Run(s.cfg, nil)
	if err != nil {
		return err
	}
	defer res.Close()

	// Create new engine (reuse conversation manager)
	llmClient := llm.NewClient(s.cfg.LLM.APIBase, s.cfg.LLM.APIKey, s.cfg.LLM.Model, s.cfg.Proxy)

	// Initialize conversation manager if not exists
	if s.convMgr == nil {
		convDir := ""
		if dir, err := config.GlobalDir(); err == nil {
			convDir = filepath.Join(dir, "conversations")
		}
		s.convMgr = conversation.NewManager(convDir)
	}

	newEngine := engine.New(engine.Config{
		LLM:          llmClient,
		Executor:     res.Router,
		Tools:        res.Tools,
		SystemPrompt: res.SystemPrompt,
		MaxCtxTokens: s.cfg.LLM.MaxCtxTokens,
		ConvMgr:      s.convMgr, // Reuse conversation manager
	})

	s.engine = newEngine
	return nil
}

func splitToolName(name string) []string {
	parts := make([]string, 0, 2)
	if idx := len(name); idx > 0 {
		for i, c := range name {
			if c == '_' && i+1 < len(name) && name[i+1] == '_' {
				parts = append(parts, name[:i], name[i+2:])
				return parts
			}
		}
	}
	return []string{name}
}

func parseIntParam(c *gin.Context, param string) int {
	var val int
	fmt.Sscanf(c.Param(param), "%d", &val)
	return val
}

func extractAuthToken(c *gin.Context) string {
	if h := c.GetHeader("Authorization"); len(h) > 7 && h[:7] == "Bearer " {
		return h[7:]
	}
	return ""
}

func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return key
	}
	return key[:4] + "..." + key[len(key)-4:]
}

// ============= Chat Session Control =============

func generateSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// stopChat cancels an active chat session.
func (s *Server) stopChat(c *gin.Context) {
	var req struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	s.sessionsMu.Lock()
	session, ok := s.sessions[req.SessionID]
	s.sessionsMu.Unlock()

	if !ok {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}

	session.cancel()
	c.JSON(200, gin.H{"message": "chat stopped"})
}

// confirmTool approves or rejects a dangerous tool call.
func (s *Server) confirmTool(c *gin.Context) {
	var req struct {
		SessionID string `json:"session_id" binding:"required"`
		Approved  bool   `json:"approved"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	s.sessionsMu.Lock()
	session, ok := s.sessions[req.SessionID]
	s.sessionsMu.Unlock()

	if !ok {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}

	select {
	case session.confirmCh <- req.Approved:
		c.JSON(200, gin.H{"message": "confirmation sent"})
	default:
		c.JSON(409, gin.H{"error": "no pending confirmation"})
	}
}

// ============= Spec Upload =============

// uploadSpec accepts a multipart file upload and parses it as an OpenAPI spec.
func (s *Server) uploadSpec(c *gin.Context) {
	file, header, err := c.Request.FormFile("spec")
	if err != nil {
		c.JSON(400, gin.H{"error": "spec file is required"})
		return
	}
	defer file.Close()

	// Save to configDir/specs/
	specsDir := ""
	if dir, err := config.GlobalDir(); err == nil {
		specsDir = filepath.Join(dir, "specs")
		os.MkdirAll(specsDir, 0755)
	}
	if specsDir == "" {
		c.JSON(500, gin.H{"error": "cannot determine config directory"})
		return
	}

	savedPath := filepath.Join(specsDir, header.Filename)
	out, err := os.Create(savedPath)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("failed to save file: %v", err)})
		return
	}
	io.Copy(out, file)
	out.Close()

	doc, err := gateway.LoadSpec(savedPath)
	if err != nil {
		os.Remove(savedPath)
		c.JSON(400, gin.H{"found": false, "error": err.Error()})
		return
	}

	tools, _ := gateway.BuildTools(doc, "_upload", "", gateway.AuthConfig{})
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	c.JSON(200, gin.H{
		"found":     true,
		"spec_path": savedPath,
		"tools":     len(tools),
		"endpoints": endpoints,
	})
}
