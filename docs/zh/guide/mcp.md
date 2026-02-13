# MCP 集成

NLUI 支持 [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) 的双向集成：

- **服务端** — 将 NLUI 工具暴露给 MCP 客户端（如 Claude Desktop）
- **客户端** — 消费外部 MCP 服务，将其工具加入 NLUI

## MCP 服务端

### stdio 模式

用于集成 Claude Desktop 等客户端的主要模式：

```bash
go run ./cmd/nlui --mcp
```

这将通过 stdin/stdout 启动一个基于 JSON-RPC 2.0 的 MCP 服务。

### Claude Desktop 配置

在 Claude Desktop 配置文件 (`claude_desktop_config.json`) 中添加：

```json
{
  "mcpServers": {
    "nlui": {
      "command": "nlui",
      "args": ["--mcp"]
    }
  }
}
```

Claude Desktop 将能访问你配置的所有 target 中发现的工具。

### SSE 模式

用于基于 HTTP 的 MCP 客户端：

```bash
go run ./cmd/nlui --mcp-sse --mcp-port 8080
```

端点：
- `GET /sse` — SSE 流，返回包含会话 URL 的 `endpoint` 事件
- `POST /messages?sessionId=<id>` — 发送 JSON-RPC 请求

### 协议细节

MCP 服务端实现了：

| 方法 | 说明 |
|---|---|
| `initialize` | 握手，返回服务端能力 |
| `tools/list` | 返回所有已发现的工具 |
| `tools/call` | 执行工具并返回结果 |
| `ping` | 健康检查 |

协议版本：`2024-11-05`

## MCP 客户端

NLUI 可以消费外部 MCP 服务，将其工具与 OpenAPI 发现的工具并列使用。

### 配置

在 `nlui.yaml` 中：

```yaml
mcp:
  servers:
    - name: filesystem
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    - name: database
      command: mcp-server-sqlite
      args: ["--db", "data.db"]
```

### 工作原理

1. NLUI 将每个 MCP 服务作为子进程启动（stdio 传输）
2. 执行 `initialize` → `notifications/initialized` 握手
3. 调用 `tools/list` 发现可用工具
4. 以服务名为前缀命名工具（如 `filesystem__read_file`）
5. 对话中将 `tools/call` 路由到对应的 MCP 服务

### 工具命名

MCP 工具会加前缀以避免冲突：

```
服务 "filesystem" 的工具 "read_file"
→ LLM 看到: filesystem__read_file
```

这样多个 MCP 服务可以与 OpenAPI 工具共存。
