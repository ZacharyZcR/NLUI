# Getting Started

## What is NLUI?

NLUI automatically reads your OpenAPI specs, converts endpoints into LLM-callable tools, and lets users interact with your backend through natural language.

```
User: "Delete user zhangsan"

NLUI: I'll call deleteUser for you.
      [tool_confirm: deleteUser — waiting for approval]

User: [approve]

NLUI: Done. User zhangsan has been deleted.
```

## Install

### From Release

Download pre-built binaries from [GitHub Releases](https://github.com/ZacharyZcR/NLUI/releases).

### From Source

```bash
go install github.com/ZacharyZcR/NLUI/cmd/nlui@latest
```

### Docker

```bash
docker compose up -d
```

## Configure

```bash
cp nlui.example.yaml nlui.yaml
```

```yaml
language: en

llm:
  api_base: http://localhost:11434/v1   # Any OpenAI-compatible endpoint
  model: qwen2.5:7b

targets:
  - name: my-backend
    base_url: http://localhost:8080      # NLUI auto-discovers /swagger/doc.json
    auth:
      type: bearer
      token: ""

server:
  port: 9000
```

## Run

```bash
# HTTP Server
go run ./cmd/nlui

# MCP stdio mode (for Claude Desktop, etc.)
go run ./cmd/nlui --mcp

# Desktop app (requires Wails)
cd desktop && wails dev
```

## Chat

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "List all users"}'
```
