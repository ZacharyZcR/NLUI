package server

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ZacharyZcR/Kelper/config"
	"github.com/ZacharyZcR/Kelper/core/conversation"
	"github.com/ZacharyZcR/Kelper/core/llm"
	"github.com/ZacharyZcR/Kelper/core/toolloop"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	cfg          *config.Config
	loop         *toolloop.Loop
	convMgr      *conversation.Manager
	tools        []llm.Tool
	systemPrompt string
	router       *gin.Engine
}

type ChatRequest struct {
	ConversationID string `json:"conversation_id"`
	Message        string `json:"message"`
}

func New(cfg *config.Config, loop *toolloop.Loop, convMgr *conversation.Manager, tools []llm.Tool, systemPrompt string) *Server {
	s := &Server{
		cfg:          cfg,
		loop:         loop,
		convMgr:      convMgr,
		tools:        tools,
		systemPrompt: systemPrompt,
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	api := r.Group("/api")
	{
		api.GET("/health", s.health)
		api.GET("/info", s.info)
		api.POST("/chat", s.chat)
		api.GET("/conversations", s.listConversations)
		api.POST("/conversations", s.createConversation)
		api.GET("/conversations/:id", s.getConversation)
		api.DELETE("/conversations/:id", s.deleteConversation)
	}

	s.router = r
	return s
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Server.Port)
	fmt.Printf("Kelper listening on %s\n", addr)
	return s.router.Run(addr)
}

func (s *Server) health(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok", "tools": len(s.tools)})
}

func (s *Server) info(c *gin.Context) {
	c.JSON(200, gin.H{"language": s.cfg.Language, "tools": len(s.tools)})
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

	conv := s.convMgr.Get(req.ConversationID)
	if conv == nil {
		conv = s.convMgr.Create("", s.systemPrompt)
	}

	conv.Messages = append(conv.Messages, llm.Message{
		Role:    "user",
		Content: req.Message,
	})

	authToken := ""
	if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
		authToken = strings.TrimPrefix(h, "Bearer ")
	}

	// SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	finalMessages, err := s.loop.Run(c.Request.Context(), conv.Messages, s.tools, authToken, func(event toolloop.Event) {
		data, _ := json.Marshal(event.Data)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, string(data))
		c.Writer.Flush()
	})

	if err != nil {
		errData, _ := json.Marshal(gin.H{"error": err.Error()})
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", string(errData))
		c.Writer.Flush()
	}

	s.convMgr.UpdateMessages(conv.ID, finalMessages)

	doneData, _ := json.Marshal(gin.H{"conversation_id": conv.ID})
	fmt.Fprintf(c.Writer, "event: done\ndata: %s\n\n", string(doneData))
	c.Writer.Flush()
}

func (s *Server) listConversations(c *gin.Context) {
	c.JSON(200, s.convMgr.List())
}

func (s *Server) createConversation(c *gin.Context) {
	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	conv := s.convMgr.Create(req.Title, s.systemPrompt)
	c.JSON(201, conv)
}

func (s *Server) getConversation(c *gin.Context) {
	conv := s.convMgr.Get(c.Param("id"))
	if conv == nil {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	c.JSON(200, conv)
}

func (s *Server) deleteConversation(c *gin.Context) {
	s.convMgr.Delete(c.Param("id"))
	c.Status(204)
}
