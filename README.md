<div align="center">

# NLUI

**Natural Language User Interface**

Turn any API into a conversational interface.

[![CI](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[中文](README.zh.md) | [Documentation](https://zacharyzcr.github.io/NLUI/)

</div>

---

NLUI reads your OpenAPI specs, converts endpoints into LLM-callable tools, and lets users interact with your backend through natural language. No custom prompts, no glue code.

```
User: "Delete user zhangsan"

NLUI: I'll call deleteUser for you.
      [tool_confirm: deleteUser — waiting for approval]

User: [approve]

NLUI: Done. User zhangsan has been deleted.
```

## Quick Start

### Install

```bash
# From source
go install github.com/ZacharyZcR/NLUI/cmd/nlui@latest

# Or download from GitHub Releases
# Or Docker
docker compose up -d
```

### Configure

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
    base_url: http://localhost:8080
    auth:
      type: bearer
      token: ""

server:
  port: 9000
```

### Run

```bash
go run ./cmd/nlui
```

### Chat

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "List all users"}'
```

## Features

- **OpenAPI Auto-Discovery** — Point at your backend, NLUI builds tools automatically
- **Streaming Chat (SSE)** — Real-time responses with tool calls and confirmations
- **Dangerous Tool Confirmation** — DELETE/PUT operations require explicit approval
- **Multi-Platform** — HTTP server, Wails desktop app, MCP protocol, pure TS engine
- **Multi-Language** — Prompts in English, Chinese, and Japanese
- **SDKs** — Go, TypeScript, Python, Java, Rust + React/Vue integrations

## Documentation

Full documentation is available at **[zacharyzcr.github.io/NLUI](https://zacharyzcr.github.io/NLUI/)**.

- [Architecture](https://zacharyzcr.github.io/NLUI/guide/architecture)
- [Configuration](https://zacharyzcr.github.io/NLUI/guide/configuration)
- [API Reference](https://zacharyzcr.github.io/NLUI/guide/api)
- [SSE Events](https://zacharyzcr.github.io/NLUI/guide/sse-events)
- [SDK Overview](https://zacharyzcr.github.io/NLUI/sdk/overview)

## License

[MIT](LICENSE)
