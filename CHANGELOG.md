# Changelog

All notable changes to this project are documented in this file.

---

## Unreleased (dev)

### Added
- **SettingsPanel Engine Adapter** — SettingsPanel now works in pure TS engine mode (no Go backend). NLUIEngine supports runtime config hot-reload (LLM / stream / language / proxy). React and Vue SettingsPanel decoupled from `NLUIClient` class to a `SettingsClient` interface.
- **SettingsPanel Component** — New `<SettingsPanel>` for React and Vue: LLM provider scanning, model fetching, stream toggle, language switch, proxy config. Server-side routes for stream/language updates.
- **TS Engine Gemini + Stream** — Pure TS engine now supports Gemini native API, stream on/off toggle, and `set_auth` built-in tool. Feature parity with Go backend.
- **README Rewrite** — Narrative on frontend evolution, feature list, architecture diagram, and roadmap (Workflow / Skill / RAG / Self-Evolving Memory).

### Fixed
- Conversation timestamps hardcoded `Z` suffix causing timezone offset — now uses proper UTC + RFC3339.
- `AuthConfig` JSON tags missing, toolset loader not merging config tokens, `set_auth` description improved.
- `set_auth` token now persists to `nlui.yaml` — survives restart.
- `NewAutoClient` incorrectly routing Gemini `/openai` compatibility endpoints.

### Changed
- Wails auto-generated `TargetAuthStatus` type bindings updated.

---

## 0.2.0 — Auth & Gemini

### Added
- **Stream Toggle** — Enable/disable streaming per session.
- **Gemini Native API** — Direct Gemini support (non-OpenAI mode) + ToolSet `set_auth` injection.
- **OpenAPI Auth Auto-Detection** — Reads security schemes from spec, generates matching auth config.
- **Auth Status Indicator** — Per-target auth state badge in conversation window.
- **Built-in Presets** — Preset ToolSets for common services + query parameter auth + tool card display.
- **Tool Grouping** — Target editing, auth UI enhancement, tool hierarchy display.
- **`set_auth` Built-in Tool** — LLM can set auth tokens via tool call. Token persists to config.

### Fixed
- Auth indicator reads runtime state, refreshes after `set_auth`.
- `set_auth` no longer overwrites endpoint's existing auth type.
- Tool name truncation deduplication, frontend event and history loading fixes.

---

## 0.1.0 — Foundation

### Added
- **Core Engine** — OpenAPI auto-discovery, LLM tool-calling loop, conversation persistence, context window truncation.
- **HTTP Server** — Gin-based REST API + SSE streaming on configurable port.
- **Desktop App** — Wails native app with streaming chat, tool confirmation, global config.
- **MCP Server** — stdio + SSE modes for Claude Desktop and MCP client integration.
- **Multi-Language SDK** — Go, TypeScript, Python, Java, Rust clients. React hooks + Vue composables. React UI + Vue UI component libraries.
- **Rich Rendering** — Tables, KV cards, badge lists, LLM fence block support.
- **i18n** — System prompts and frontend UI in English, Chinese, Japanese.
- **Dangerous Tool Confirmation** — DELETE/PUT operations require explicit approval.
- **Proxy Support** — HTTP/SOCKS5 proxy config with connection testing.
- **Cloud Presets** — Provider auto-detection for OpenAI, DeepSeek, Ollama, LM Studio, vLLM.
- **Token Usage Indicator** — Per-message token count display.
- **Context Editing** — Edit, delete, regenerate messages in conversation history.
- **VitePress Docs** — Documentation site with GitHub Pages auto-deploy.

### Infrastructure
- CI pipeline covering `dev` branch (push + PR).
- Husky pre-commit hook with `gofmt`.
- Docker + docker-compose support.
- `.editorconfig` for consistent formatting.
