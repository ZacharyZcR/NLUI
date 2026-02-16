# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `service/` package — shared business logic extracted from desktop and server hosts
- ToolSet intermediate format for offline tool import
- Conversation-level tool configuration (enable/disable per source or tool)
- Message editing, deletion, and regeneration
- Cookie-based session authentication for HTTP server
- MCP server (stdio + SSE) and MCP client support
- Context window auto-truncation
- Proxy configuration and connectivity testing
- Cloud provider presets (OpenAI, Gemini, DeepSeek, Claude)
- Local LLM auto-detection (Ollama, LM Studio)
- Bilingual system prompts (en/zh)
- Token usage indicators
- Tool result rich rendering with fence block support
- Desktop app via Wails with streaming chat and tool confirmation
- Next.js + Shadcn/ui chat frontend
- TypeScript engine SDK (`@nlui/engine`)
- Multi-language client SDKs (Go, JS, Python, Java, Rust)
- UI component SDKs (React, Vue, Web Components)
- GitHub Actions CI (Go build, test, lint)
- Issue templates (bug report, feature request)
- Bilingual README (en/zh) with architecture diagram

### Changed
- Engine is now the single entry point — hosts never touch toolloop/conversation directly
- `bootstrap/` moved to top-level as host helper
- Tool names sanitized for strict LLM provider requirements (Gemini compatibility)

### Fixed
- Go nil slice serializing to JSON `null` instead of `[]`, crashing frontend
- SSE connections staying alive after backend stops
- Duplicate empty conversations created by tool config clicks
- Scroll constraints — disabled page-level scroll, panels use native overflow
