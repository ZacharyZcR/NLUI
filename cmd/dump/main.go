package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/NLUI/gateway"
	"github.com/ZacharyZcR/NLUI/mcp"
)

func main() {
	specPath := os.Args[1]
	targetName := "petstore"

	doc, err := gateway.LoadSpec(specPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "load: %v\n", err)
		os.Exit(1)
	}

	tools, _ := gateway.BuildTools(doc, targetName, "http://localhost:8080", gateway.AuthConfig{Type: "bearer"})

	fmt.Println("=== LLM Tool Definitions (OpenAI format) ===")
	fmt.Printf("Total: %d tools\n\n", len(tools))

	for _, t := range tools {
		data, _ := json.MarshalIndent(t, "", "  ")
		fmt.Println(string(data))
		fmt.Println()
	}

	fmt.Println("\n=== MCP Tool Definitions ===")

	var mcpTools []mcp.MCPTool
	for _, t := range tools {
		mcpTools = append(mcpTools, mcp.LLMToolToMCP(t))
	}

	// Simulate MCP tools/list response
	resp := map[string]interface{}{
		"tools": mcpTools,
	}
	data, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Println(string(data))
}
