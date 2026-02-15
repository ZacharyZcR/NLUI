package server

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/engine"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	cfg    *config.Config
	engine *engine.Engine
	router *gin.Engine
}

type ChatRequest struct {
	ConversationID string `json:"conversation_id"`
	Message        string `json:"message"`
}

func New(cfg *config.Config, eng *engine.Engine) *Server {
	s := &Server{
		cfg:    cfg,
		engine: eng,
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

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

	// SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	convID, err := s.engine.Chat(c.Request.Context(), req.ConversationID, req.Message, authToken, func(event engine.Event) {
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
