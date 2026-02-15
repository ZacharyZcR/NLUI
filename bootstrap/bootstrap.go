package bootstrap

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/core/llm"
	"github.com/ZacharyZcR/NLUI/gateway"
	"github.com/ZacharyZcR/NLUI/mcp"
	"github.com/getkin/kin-openapi/openapi3"
)

// Router combines HTTP caller and MCP clients into a unified tool executor.
type Router struct {
	HttpCaller *gateway.Caller
	McpClients map[string]*mcp.Client
}

func (r *Router) Execute(ctx context.Context, toolName, argsJSON, authToken string) (string, error) {
	if r.HttpCaller.HasTool(toolName) {
		return r.HttpCaller.Execute(ctx, toolName, argsJSON, authToken)
	}
	parts := strings.SplitN(toolName, "__", 2)
	if len(parts) == 2 {
		if client, ok := r.McpClients[parts[0]]; ok {
			return client.CallTool(ctx, parts[1], argsJSON)
		}
	}
	return "", fmt.Errorf("unknown tool: %s", toolName)
}

var promptTemplates = map[string]struct {
	intro   string
	tools   string
	closing string
}{
	"zh": {
		intro:   "你是 NLUI，一个自然语言用户界面。你可以通过工具与以下系统交互：\n\n",
		tools:   "可用工具：\n",
		closing: "\n请根据用户需求使用合适的工具完成任务。如果不确定用户意图，先询问用户。\n\n你可以在回复中使用特殊代码块来展示结构化数据：\n- ```kelper:table 表格数据（JSON对象数组）\n- ```kelper:kv 键值对（JSON对象）\n- ```kelper:badges 标签列表（JSON基础类型数组）\n工具返回的结构化数据会自动识别渲染，这些标记仅在你想主动展示数据时使用。",
	},
	"en": {
		intro:   "You are NLUI, a Natural Language User Interface. You can interact with the following systems through tools:\n\n",
		tools:   "Available tools:\n",
		closing: "\nUse the appropriate tools to help users accomplish their tasks. If unsure about the user's intent, ask for clarification.\n\nYou can use special code blocks in your replies to display structured data:\n- ```kelper:table for tabular data (JSON array of objects)\n- ```kelper:kv for key-value pairs (JSON object)\n- ```kelper:badges for label lists (JSON array of primitives)\nStructured data from tool results is auto-detected and rendered. Use these markers only when you want to proactively present data.",
	},
	"ja": {
		intro:   "あなたは NLUI、自然言語ユーザーインターフェースです。以下のシステムとツールを通じてやり取りできます：\n\n",
		tools:   "利用可能なツール：\n",
		closing: "\nユーザーの要求に応じて適切なツールを使用してタスクを完了してください。ユーザーの意図が不明な場合は確認してください。\n\n返信内で特殊コードブロックを使用して構造化データを表示できます：\n- ```kelper:table テーブルデータ（JSONオブジェクト配列）\n- ```kelper:kv キーバリューペア（JSONオブジェクト）\n- ```kelper:badges ラベルリスト（JSONプリミティブ配列）\nツール結果の構造化データは自動検出・レンダリングされます。これらのマーカーはデータを能動的に表示したい場合にのみ使用してください。",
	},
}

// BuildSystemPrompt constructs the system prompt from language, targets, and discovered tools.
func BuildSystemPrompt(lang string, targets []config.Target, tools []llm.Tool) string {
	t, ok := promptTemplates[lang]
	if !ok {
		t = promptTemplates["en"]
	}

	var sb strings.Builder
	sb.WriteString(t.intro)

	for _, tgt := range targets {
		desc := tgt.Description
		if desc == "" {
			desc = tgt.Name
		}
		sb.WriteString(fmt.Sprintf("## %s\n%s\n\n", tgt.Name, desc))
	}

	if len(tools) > 0 {
		sb.WriteString(t.tools)
		for _, tool := range tools {
			sb.WriteString(fmt.Sprintf("- %s: %s\n", tool.Function.Name, tool.Function.Description))
		}
	}

	sb.WriteString(t.closing)
	return sb.String()
}

// OnTargetFunc is called after each target's tools are discovered.
type OnTargetFunc func(name string, tools []llm.Tool)

// DiscoverTools loads OpenAPI specs from all targets and returns aggregated tools and endpoints.
func DiscoverTools(targets []config.Target, onTarget OnTargetFunc) ([]llm.Tool, map[string]*gateway.Endpoint) {
	var allTools []llm.Tool
	allEndpoints := make(map[string]*gateway.Endpoint)

	for _, target := range targets {
		var doc *openapi3.T

		if target.Spec != "" {
			fmt.Fprintf(os.Stderr, "Loading spec: %s (%s)\n", target.Name, target.Spec)
			var err error
			doc, err = gateway.LoadSpec(target.Spec)
			if err != nil {
				fmt.Fprintf(os.Stderr, "WARN: skip %s: %v\n", target.Name, err)
				continue
			}
		} else if target.BaseURL != "" {
			fmt.Fprintf(os.Stderr, "Discovering spec: %s (%s)\n", target.Name, target.BaseURL)
			var specURL string
			var err error
			doc, specURL, err = gateway.DiscoverSpec(target.BaseURL)
			if err != nil {
				fmt.Fprintf(os.Stderr, "WARN: skip %s: %v\n", target.Name, err)
				continue
			}
			fmt.Fprintf(os.Stderr, "  Found: %s\n", specURL)
		}

		if doc == nil {
			continue
		}

		auth := gateway.AuthConfig{
			Type:       target.Auth.Type,
			HeaderName: target.Auth.HeaderName,
			Token:      target.Auth.Token,
		}
		tools, endpoints := gateway.BuildTools(doc, target.Name, target.BaseURL, auth)
		allTools = append(allTools, tools...)
		for k, v := range endpoints {
			allEndpoints[k] = v
		}

		fmt.Fprintf(os.Stderr, "  %d endpoints discovered\n", len(tools))

		if onTarget != nil {
			onTarget(target.Name, tools)
		}
	}

	return allTools, allEndpoints
}

// InitMCPClients connects to configured MCP servers and returns clients + their tools.
func InitMCPClients(clients []config.MCPClientConfig) (map[string]*mcp.Client, []llm.Tool) {
	mcpClients := make(map[string]*mcp.Client)
	var tools []llm.Tool

	for _, mcpCfg := range clients {
		fmt.Fprintf(os.Stderr, "Connecting MCP: %s (%s %v)\n", mcpCfg.Name, mcpCfg.Command, mcpCfg.Args)
		client, err := mcp.NewStdioClient(mcpCfg.Name, mcpCfg.Command, mcpCfg.Args)
		if err != nil {
			fmt.Fprintf(os.Stderr, "WARN: skip MCP %s: %v\n", mcpCfg.Name, err)
			continue
		}
		mcpClients[mcpCfg.Name] = client

		for _, t := range client.Tools() {
			tools = append(tools, mcp.MCPToolToLLM(t, mcpCfg.Name))
		}
		fmt.Fprintf(os.Stderr, "  %d tools from %s\n", len(client.Tools()), mcpCfg.Name)
	}

	return mcpClients, tools
}

// Result holds everything produced by a full bootstrap Run.
type Result struct {
	Tools        []llm.Tool
	Router       *Router
	MCPClients   map[string]*mcp.Client
	SystemPrompt string
}

// Close shuts down all MCP clients.
func (r *Result) Close() {
	for _, c := range r.MCPClients {
		c.Close()
	}
}

// Run performs full initialization: tool discovery, MCP init, router assembly, system prompt.
func Run(cfg *config.Config, onTarget OnTargetFunc) (*Result, error) {
	allTools, allEndpoints := DiscoverTools(cfg.Targets, onTarget)

	mcpClients, mcpTools := InitMCPClients(cfg.MCP.Clients)
	allTools = append(allTools, mcpTools...)

	fmt.Fprintf(os.Stderr, "Total tools: %d\n", len(allTools))

	caller := gateway.NewCaller(allEndpoints)
	router := &Router{HttpCaller: caller, McpClients: mcpClients}
	systemPrompt := BuildSystemPrompt(cfg.Language, cfg.Targets, allTools)

	return &Result{
		Tools:        allTools,
		Router:       router,
		MCPClients:   mcpClients,
		SystemPrompt: systemPrompt,
	}, nil
}
