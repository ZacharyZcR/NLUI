<div align="center">

# NLUI

**Natural Language User Interface**

Turn any API into a conversational interface.

[![CI](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[中文文档](README.zh.md)

</div>

---

## What is NLUI?

NLUI automatically reads your OpenAPI specs, converts endpoints into LLM-callable tools, and lets users interact with your backend through natural language. No custom prompts, no glue code.

```
User: "Delete user zhangsan"

NLUI: I'll call deleteUser for you.
      [tool_confirm: deleteUser — waiting for approval]

User: [approve]

NLUI: Done. User zhangsan has been deleted.
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Hosts                         │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  Desktop   │  │HTTP Server│  │  MCP Server  │  │
│  │  (Wails)   │  │  (Gin)    │  │ (stdio/SSE) │  │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│        └───────────────┼───────────────┘         │
│                   ┌────┴────┐                    │
│                   │ engine  │  ← single entry    │
│                   └────┬────┘                    │
│        ┌───────────────┼───────────────┐         │
│   ┌────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐  │
│   │toolloop │   │conversation │  │    llm     │  │
│   └─────────┘   └─────────────┘  └───────────┘  │
│                      core/                       │
├─────────────────────────────────────────────────┤
│   gateway (OpenAPI)       mcp (MCP protocol)     │
│   bootstrap (init helper)                        │
└─────────────────────────────────────────────────┘
```

- **core/** — Pure logic: tool loop, conversation manager, LLM client. Zero external dependencies.
- **engine/** — The only entry point for hosts. Isolates core internals.
- **gateway/** — Parses OpenAPI specs, builds LLM tool definitions, executes HTTP calls.
- **mcp/** — Bidirectional MCP support: expose tools as MCP server or consume external MCP servers.
- **bootstrap/** — Initialization helper: discovers tools, builds system prompts, wires everything up.

## Quick Start

### 1. Configure

```bash
cp nlui.example.yaml kelper.yaml
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

### 2. Run

```bash
# HTTP Server
go run ./cmd/nlui

# MCP stdio mode (for Claude Desktop, etc.)
go run ./cmd/nlui --mcp

# Desktop app (requires Wails)
cd desktop && wails dev
```

### 3. Chat

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "List all users"}'
```

## Features

| Feature | HTTP Server | Desktop | SDK |
|---|:---:|:---:|:---:|
| Streaming chat (SSE) | ✓ | ✓ | ✓ |
| OpenAPI auto-discovery | ✓ | ✓ | — |
| Dangerous tool confirmation | ✓ | ✓ | ✓ |
| Stop generation | ✓ | ✓ | ✓ |
| Spec file upload | ✓ | ✓ | ✓ |
| Conversation management | ✓ | ✓ | ✓ |
| Per-conversation tool filter | ✓ | ✓ | ✓ |
| Message edit & regenerate | ✓ | ✓ | ✓ |
| MCP server / client | ✓ | ✓ | — |
| Multi-language prompts (zh/en/ja) | ✓ | ✓ | — |

## SDKs

### Client SDKs

| Language | Package | Install |
|---|---|---|
| Go | `sdk/go` | `go get github.com/ZacharyZcR/NLUI/sdk/go` |
| TypeScript | `@nlui/client` | `npm install @nlui/client` |
| Python | `nlui` | `pip install nlui` |
| Java | `nlui-sdk` | Maven dependency |
| Rust | `nlui` | `cargo add nlui` |

### Framework Integrations

| Framework | Package | Description |
|---|---|---|
| React | `@nlui/react` | Hooks: `useNLUI()` |
| Vue 3 | `@nlui/vue` | Composables: `useNLUI()` |
| Web Components | `@nlui/components` | Framework-agnostic `<nlui-chat>` |
| React UI | `@nlui/react-ui` | Drop-in chat component |
| Vue UI | `@nlui/vue-ui` | Drop-in chat component |

### Pure TypeScript Engine

`@nlui/engine` — Full NLUI engine in TypeScript, zero backend dependency. Runs entirely in the browser.

```ts
import { createEngine } from "@nlui/engine";
import { useEngine } from "@nlui/engine/react";
```

## API Reference

### Chat (SSE)

```
POST /api/chat
```

SSE event flow:

```
← event: session         {"session_id":"abc123"}
← event: content_delta   {"delta":"Sure, "}
← event: tool_call       {"name":"deleteUser","arguments":"..."}
← event: tool_confirm    {"session_id":"abc123","name":"deleteUser","arguments":"..."}
→ POST /api/chat/confirm {"session_id":"abc123","approved":true}
← event: tool_result     {"name":"deleteUser","result":"..."}
← event: done            {"conversation_id":"conv456"}
```

### Session Control

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat/stop` | POST | Cancel active chat |
| `/api/chat/confirm` | POST | Approve/reject dangerous tool |
| `/api/specs/upload` | POST | Upload OpenAPI spec file |

### Full endpoint list

<details>
<summary>All routes</summary>

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/info` | GET | Server info |
| `/api/chat` | POST | Streaming chat (SSE) |
| `/api/chat/stop` | POST | Stop active chat |
| `/api/chat/confirm` | POST | Tool confirmation |
| `/api/specs/upload` | POST | Upload OpenAPI spec |
| `/api/conversations` | GET | List conversations |
| `/api/conversations` | POST | Create conversation |
| `/api/conversations/:id` | GET | Get conversation |
| `/api/conversations/:id` | DELETE | Delete conversation |
| `/api/conversations/:id/messages/:index` | PUT | Edit message & regenerate |
| `/api/conversations/:id/messages/:index` | DELETE | Delete message |
| `/api/conversations/:id/messages/:index/from` | DELETE | Delete messages from index |
| `/api/conversations/:id/regenerate` | POST | Regenerate from index |
| `/api/conversations/:id/tools` | GET | Get tool config |
| `/api/conversations/:id/tools` | PUT | Update tool config |
| `/api/targets` | GET | List API targets |
| `/api/targets` | POST | Add target |
| `/api/targets/:name` | DELETE | Remove target |
| `/api/targets/probe` | POST | Auto-discover spec |
| `/api/tools` | GET | List all tools |
| `/api/tools/sources` | GET | List tool sources |
| `/api/config/llm` | GET | Get LLM config |
| `/api/config/llm` | PUT | Update LLM config |
| `/api/config/llm/providers` | GET | Probe LLM providers |
| `/api/config/llm/models` | POST | Fetch available models |
| `/api/config/proxy` | GET | Get proxy config |
| `/api/config/proxy` | PUT | Update proxy config |
| `/api/config/proxy/test` | POST | Test proxy connection |

</details>

## Project Structure

```
.
├── bootstrap/          # Initialization helper
├── cmd/
│   ├── nlui/           # Main entry point
│   └── dump/           # Tool definition exporter
├── config/             # YAML config management
├── core/
│   ├── llm/            # OpenAI-compatible LLM client
│   ├── conversation/   # Conversation manager (memory + disk)
│   └── toolloop/       # Core tool-calling loop
├── desktop/            # Wails desktop app (separate go.mod)
├── engine/             # Host-facing facade
├── frontend/           # Next.js 16 + React 19 web UI
├── gateway/            # OpenAPI spec → LLM tools
├── mcp/                # MCP protocol (server + client)
├── sdk/
│   ├── go/             # Go SDK
│   ├── js/             # TypeScript SDK (@nlui/client)
│   ├── python/         # Python SDK
│   ├── java/           # Java SDK
│   ├── rust/           # Rust SDK
│   ├── engine/         # Pure TS engine (@nlui/engine)
│   ├── react/          # React hooks (@nlui/react)
│   ├── vue/            # Vue composables (@nlui/vue)
│   ├── components/     # Web Components (@nlui/components)
│   ├── react-ui/       # React chat UI (@nlui/react-ui)
│   ├── vue-ui/         # Vue chat UI (@nlui/vue-ui)
│   └── examples/       # Usage examples (6 languages)
├── server/             # HTTP server (Gin)
└── nlui.example.yaml   # Example configuration
```

## License

[MIT](LICENSE)
