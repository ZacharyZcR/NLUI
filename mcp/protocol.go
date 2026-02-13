package mcp

import (
	"encoding/json"

	"github.com/ZacharyZcR/NLUI/core/llm"
)

// JSON-RPC 2.0

type RPCRequest struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      *json.RawMessage `json:"id,omitempty"`
	Method  string           `json:"method"`
	Params  json.RawMessage  `json:"params,omitempty"`
}

type RPCResponse struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      *json.RawMessage `json:"id,omitempty"`
	Result  json.RawMessage  `json:"result,omitempty"`
	Error   *RPCError        `json:"error,omitempty"`
}

type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// MCP Protocol

type InitializeParams struct {
	ProtocolVersion string     `json:"protocolVersion"`
	ClientInfo      EntityInfo `json:"clientInfo"`
	Capabilities    struct{}   `json:"capabilities"`
}

type InitializeResult struct {
	ProtocolVersion string             `json:"protocolVersion"`
	ServerInfo      EntityInfo         `json:"serverInfo"`
	Capabilities    ServerCapabilities `json:"capabilities"`
}

type EntityInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type ServerCapabilities struct {
	Tools *ToolsCapability `json:"tools,omitempty"`
}

type ToolsCapability struct{}

type MCPTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	InputSchema interface{} `json:"inputSchema"`
}

type ToolsListResult struct {
	Tools []MCPTool `json:"tools"`
}

type ToolCallParams struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments,omitempty"`
}

type ToolCallResult struct {
	Content []ContentBlock `json:"content"`
	IsError bool           `json:"isError,omitempty"`
}

type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Conversion

func LLMToolToMCP(t llm.Tool) MCPTool {
	return MCPTool{
		Name:        t.Function.Name,
		Description: t.Function.Description,
		InputSchema: t.Function.Parameters,
	}
}

func MCPToolToLLM(t MCPTool, prefix string) llm.Tool {
	return llm.Tool{
		Type: "function",
		Function: llm.ToolFunction{
			Name:        prefix + "__" + t.Name,
			Description: t.Description,
			Parameters:  t.InputSchema,
		},
	}
}
