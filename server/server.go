package server

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/core/conversation"
	"github.com/ZacharyZcR/NLUI/engine"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type chatSession struct {
	cancel    context.CancelFunc
	confirmCh chan bool
}

type Server struct {
	cfg        *config.Config
	engine     *engine.Engine
	router     *gin.Engine
	convMgr    *conversation.Manager // Persist across reloads
	sessions   map[string]*chatSession
	sessionsMu sync.Mutex
}

type ChatRequest struct {
	ConversationID string `json:"conversation_id"`
	Message        string `json:"message"`
}

func New(cfg *config.Config, eng *engine.Engine) *Server {
	s := &Server{
		cfg:      cfg,
		engine:   eng,
		sessions: make(map[string]*chatSession),
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")
	{
		// Health & Info
		api.GET("/health", s.health)
		api.GET("/info", s.info)

		// Chat
		api.POST("/chat", s.chat)
		api.POST("/chat/stop", s.stopChat)
		api.POST("/chat/confirm", s.confirmTool)

		// Specs
		api.POST("/specs/upload", s.uploadSpec)

		// Conversations
		api.GET("/conversations", s.listConversations)
		api.POST("/conversations", s.createConversation)
		api.GET("/conversations/:id", s.getConversation)
		api.DELETE("/conversations/:id", s.deleteConversation)

		// Phase 1: Targets Management
		api.GET("/targets", s.listTargets)
		api.POST("/targets", s.addTarget)
		api.DELETE("/targets/:name", s.removeTarget)
		api.POST("/targets/probe", s.probeTarget)

		// Phase 2: Tools Management
		api.GET("/tools", s.listTools)
		api.GET("/tools/sources", s.listToolSources)
		api.GET("/conversations/:id/tools", s.getConversationTools)
		api.PUT("/conversations/:id/tools", s.updateConversationTools)

		// Phase 3: Message Editing & Regeneration
		api.PUT("/conversations/:id/messages/:index", s.editMessage)
		api.POST("/conversations/:id/regenerate", s.regenerateFrom)
		api.DELETE("/conversations/:id/messages/:index", s.deleteMessage)
		api.DELETE("/conversations/:id/messages/:index/from", s.deleteMessagesFrom)

		// Phase 4: LLM Configuration
		api.GET("/config/llm", s.getLLMConfig)
		api.PUT("/config/llm", s.updateLLMConfig)
		api.GET("/config/llm/providers", s.probeLLMProviders)
		api.POST("/config/llm/models", s.fetchModels)

		// Phase 5: Proxy Configuration
		api.GET("/config/proxy", s.getProxyConfig)
		api.PUT("/config/proxy", s.updateProxyConfig)
		api.POST("/config/proxy/test", s.testProxy)
	}

	s.router = r
	return s
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Server.Port)
	fmt.Printf("NLUI listening on %s\n", addr)
	return s.router.Run(addr)
}

func (s *Server) health(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok", "tools": len(s.engine.Tools())})
}

func (s *Server) info(c *gin.Context) {
	c.JSON(200, gin.H{"language": s.cfg.Language, "tools": len(s.engine.Tools())})
}

func (s *Server) chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Message == "" {
		c.JSON(400, gin.H{"error": "message is required"})
		return
	}

	authToken := ""
	if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
		authToken = strings.TrimPrefix(h, "Bearer ")
	}

	// Create session
	sessionID := generateSessionID()
	ctx, cancel := context.WithCancel(c.Request.Context())
	session := &chatSession{cancel: cancel, confirmCh: make(chan bool, 1)}
	s.sessionsMu.Lock()
	s.sessions[sessionID] = session
	s.sessionsMu.Unlock()
	defer func() {
		s.sessionsMu.Lock()
		delete(s.sessions, sessionID)
		s.sessionsMu.Unlock()
	}()

	// SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// Send session event
	if data, err := json.Marshal(gin.H{"session_id": sessionID}); err == nil {
		fmt.Fprintf(c.Writer, "event: session\ndata: %s\n\n", string(data))
		c.Writer.Flush()
	}

	confirm := func(toolName, argsJSON string) bool {
		if data, err := json.Marshal(gin.H{
			"session_id": sessionID,
			"name":       toolName,
			"arguments":  argsJSON,
		}); err == nil {
			fmt.Fprintf(c.Writer, "event: tool_confirm\ndata: %s\n\n", string(data))
			c.Writer.Flush()
		}
		select {
		case approved := <-session.confirmCh:
			return approved
		case <-ctx.Done():
			return false
		}
	}

	convID, err := s.engine.Chat(ctx, req.ConversationID, req.Message, authToken, confirm, func(event engine.Event) {
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

func (s *Server) listConversations(c *gin.Context) {
	c.JSON(200, s.engine.ListConversations())
}

func (s *Server) createConversation(c *gin.Context) {
	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	conv := s.engine.CreateConversation(req.Title)
	c.JSON(201, conv)
}

func (s *Server) getConversation(c *gin.Context) {
	conv := s.engine.GetConversation(c.Param("id"))
	if conv == nil {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	c.JSON(200, conv)
}

func (s *Server) deleteConversation(c *gin.Context) {
	s.engine.DeleteConversation(c.Param("id"))
	c.Status(204)
}
