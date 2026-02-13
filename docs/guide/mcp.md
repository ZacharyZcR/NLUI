# MCP Integration

NLUI supports the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) in both directions:

- **Server** — Expose NLUI tools to MCP clients (e.g., Claude Desktop)
- **Client** — Consume external MCP servers and add their tools to NLUI

## MCP Server

### stdio Mode

The primary mode for integrating with Claude Desktop and similar clients:

```bash
go run ./cmd/nlui --mcp
```

This starts an MCP server over stdin/stdout using JSON-RPC 2.0.

### Claude Desktop Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

Claude Desktop will then have access to all tools discovered from your configured targets.

### SSE Mode

For HTTP-based MCP clients:

```bash
go run ./cmd/nlui --mcp-sse --mcp-port 8080
```

Endpoints:
- `GET /sse` — SSE stream, returns `endpoint` event with session URL
- `POST /messages?sessionId=<id>` — Send JSON-RPC requests

### Protocol Details

The MCP server implements:

| Method | Description |
|---|---|
| `initialize` | Handshake, returns server capabilities |
| `tools/list` | Returns all discovered tools |
| `tools/call` | Executes a tool and returns the result |
| `ping` | Health check |

Protocol version: `2024-11-05`

## MCP Client

NLUI can consume external MCP servers, adding their tools alongside OpenAPI-discovered tools.

### Configuration

In `nlui.yaml`:

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

### How It Works

1. NLUI spawns each MCP server as a subprocess (stdio transport)
2. Performs `initialize` → `notifications/initialized` handshake
3. Calls `tools/list` to discover available tools
4. Prefixes tool names with the server name (e.g., `filesystem__read_file`)
5. Routes `tools/call` to the correct MCP server during chat

### Tool Naming

MCP tools are prefixed to avoid collisions:

```
Server "filesystem" with tool "read_file"
→ LLM sees: filesystem__read_file
```

This allows multiple MCP servers to coexist with OpenAPI tools.
