package mcp

import (
	"bufio"
	"context"
	cryptoRand "crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
)

type Executor interface {
	Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error)
}

type Server struct {
	tools    []MCPTool
	executor Executor
}

func NewServer(tools []MCPTool, executor Executor) *Server {
	return &Server{tools: tools, executor: executor}
}

// RunStdio serves MCP protocol over stdin/stdout.
func (s *Server) RunStdio() error {
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var req RPCRequest
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			continue
		}

		resp := s.handleRequest(req)
		if resp == nil {
			continue
		}

		data, _ := json.Marshal(resp)
		fmt.Fprintf(os.Stdout, "%s\n", string(data))
	}
	return scanner.Err()
}

// RunSSE serves MCP protocol over HTTP SSE.
func (s *Server) RunSSE(port int) error {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	var sessions sync.Map

	r.GET("/sse", func(c *gin.Context) {
		sessionID := newSessionID()
		ch := make(chan []byte, 64)
		sessions.Store(sessionID, ch)
		defer func() {
			sessions.Delete(sessionID)
			close(ch)
		}()

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")

		endpoint := fmt.Sprintf("http://localhost:%d/messages?sessionId=%s", port, sessionID)
		fmt.Fprintf(c.Writer, "event: endpoint\ndata: %s\n\n", endpoint)
		c.Writer.Flush()

		ctx := c.Request.Context()
		for {
			select {
			case msg, ok := <-ch:
				if !ok {
					return
				}
				fmt.Fprintf(c.Writer, "event: message\ndata: %s\n\n", string(msg))
				c.Writer.Flush()
			case <-ctx.Done():
				return
			}
		}
	})

	r.POST("/messages", func(c *gin.Context) {
		sessionID := c.Query("sessionId")
		val, ok := sessions.Load(sessionID)
		if !ok {
			c.JSON(404, gin.H{"error": "session not found"})
			return
		}
		ch := val.(chan []byte)

		var req RPCRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		resp := s.handleRequest(req)
		if resp != nil {
			data, _ := json.Marshal(resp)
			ch <- data
		}

		c.Status(202)
	})

	fmt.Printf("MCP SSE server on :%d\n", port)
	return r.Run(fmt.Sprintf(":%d", port))
}

func (s *Server) handleRequest(req RPCRequest) *RPCResponse {
	switch req.Method {
	case "initialize":
		return s.handleInitialize(req)
	case "notifications/initialized":
		return nil
	case "tools/list":
		return s.handleToolsList(req)
	case "tools/call":
		return s.handleToolsCall(req)
	case "ping":
		return s.resultResponse(req.ID, json.RawMessage(`{}`))
	default:
		return s.errorResponse(req.ID, -32601, "method not found")
	}
}

func (s *Server) handleInitialize(req RPCRequest) *RPCResponse {
	result := InitializeResult{
		ProtocolVersion: "2024-11-05",
		ServerInfo:      EntityInfo{Name: "kelper", Version: "0.1.0"},
		Capabilities:    ServerCapabilities{Tools: &ToolsCapability{}},
	}
	data, _ := json.Marshal(result)
	return s.resultResponse(req.ID, data)
}

func (s *Server) handleToolsList(req RPCRequest) *RPCResponse {
	result := ToolsListResult{Tools: s.tools}
	data, _ := json.Marshal(result)
	return s.resultResponse(req.ID, data)
}

func (s *Server) handleToolsCall(req RPCRequest) *RPCResponse {
	var params ToolCallParams
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return s.errorResponse(req.ID, -32602, "invalid params")
	}

	argsJSON, _ := json.Marshal(params.Arguments)
	output, err := s.executor.Execute(context.Background(), params.Name, string(argsJSON), "")

	if err != nil {
		result := ToolCallResult{
			Content: []ContentBlock{{Type: "text", Text: fmt.Sprintf("Error: %s", err.Error())}},
			IsError: true,
		}
		data, _ := json.Marshal(result)
		return s.resultResponse(req.ID, data)
	}

	result := ToolCallResult{
		Content: []ContentBlock{{Type: "text", Text: output}},
	}
	data, _ := json.Marshal(result)
	return s.resultResponse(req.ID, data)
}

func (s *Server) resultResponse(id *json.RawMessage, result json.RawMessage) *RPCResponse {
	return &RPCResponse{JSONRPC: "2.0", ID: id, Result: result}
}

func (s *Server) errorResponse(id *json.RawMessage, code int, msg string) *RPCResponse {
	return &RPCResponse{JSONRPC: "2.0", ID: id, Error: &RPCError{Code: code, Message: msg}}
}

func newSessionID() string {
	b := make([]byte, 16)
	cryptoRand.Read(b)
	return fmt.Sprintf("%x", b)
}
