# Architecture

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

## Layers

| Layer | Package | Responsibility |
|---|---|---|
| **core/** | `toolloop`, `conversation`, `llm` | Pure logic. Tool-calling loop, conversation manager, LLM client. Zero external dependencies. |
| **engine/** | `engine` | The only entry point for hosts. Isolates core internals. |
| **service/** | `service` | Shared business logic: target CRUD, config management, LLM settings. |
| **gateway/** | `gateway` | Parses OpenAPI specs, builds LLM tool definitions, executes HTTP calls. |
| **mcp/** | `mcp` | Bidirectional MCP support: expose tools or consume external MCP servers. |
| **bootstrap/** | `bootstrap` | Initialization helper: discovers tools, builds system prompts, wires everything up. |

## Hosts

All hosts go through `engine/` — they never touch `toolloop` or `conversation` directly.

- **HTTP Server** (`server/`) — Gin-based REST + SSE streaming.
- **Desktop** (`desktop/`) — Wails v2 app with React frontend. Separate Go module.
- **MCP Server** — Exposes NLUI tools via MCP stdio/SSE for Claude Desktop and other clients.
