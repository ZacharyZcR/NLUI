package main

import (
	"fmt"
	"log"
	"os"

	"github.com/ZacharyZcR/NLUI/bootstrap"
	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/core/llm"
	"github.com/ZacharyZcR/NLUI/engine"
	"github.com/ZacharyZcR/NLUI/mcp"
	"github.com/ZacharyZcR/NLUI/server"
)

func main() {
	fmt.Println("NLUI - Natural Language User Interface")
	fmt.Println("=====================")

	// Parse args: kelper [--mcp|--mcp-sse PORT] [config-path]
	mcpStdio := false
	mcpSSEPort := 0
	cfgPath := "kelper.yaml"

	args := os.Args[1:]
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--mcp":
			mcpStdio = true
		case "--mcp-sse":
			if i+1 < len(args) {
				i++
				fmt.Sscanf(args[i], "%d", &mcpSSEPort)
			}
		default:
			cfgPath = args[i]
		}
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	res, err := bootstrap.Run(cfg, nil)
	if err != nil {
		log.Fatalf("bootstrap: %v", err)
	}
	defer res.Close()

	// MCP Server mode: expose tools via MCP protocol (no Engine needed)
	if mcpStdio {
		res.Close()
		mcpTools := llmToolsToMCP(res.Tools)
		srv := mcp.NewServer(mcpTools, res.Router)
		if err := srv.RunStdio(); err != nil {
			log.Fatalf("MCP stdio: %v", err)
		}
		return
	}

	if mcpSSEPort > 0 {
		res.Close()
		mcpTools := llmToolsToMCP(res.Tools)
		srv := mcp.NewServer(mcpTools, res.Router)
		if err := srv.RunSSE(mcpSSEPort); err != nil {
			log.Fatalf("MCP SSE: %v", err)
		}
		return
	}

	// Default: HTTP chat server
	eng := engine.New(engine.Config{
		LLM:          llm.NewClient(cfg.LLM.APIBase, cfg.LLM.APIKey, cfg.LLM.Model, cfg.Proxy),
		Executor:     res.Router,
		Tools:        res.Tools,
		SystemPrompt: res.SystemPrompt,
		MaxCtxTokens: cfg.LLM.MaxCtxTokens,
	})

	// Optionally also start MCP SSE server in background
	if cfg.MCP.Server.SSEPort > 0 {
		mcpTools := llmToolsToMCP(res.Tools)
		mcpSrv := mcp.NewServer(mcpTools, res.Router)
		go func() {
			if err := mcpSrv.RunSSE(cfg.MCP.Server.SSEPort); err != nil {
				fmt.Fprintf(os.Stderr, "MCP SSE error: %v\n", err)
			}
		}()
	}

	srv := server.New(cfg, eng, cfgPath)
	if err := srv.Run(); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func llmToolsToMCP(tools []llm.Tool) []mcp.MCPTool {
	out := make([]mcp.MCPTool, len(tools))
	for i, t := range tools {
		out[i] = mcp.LLMToolToMCP(t)
	}
	return out
}
