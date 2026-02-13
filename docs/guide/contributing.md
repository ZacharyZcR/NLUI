# Contributing

## Prerequisites

- **Go** 1.25+
- **Node.js** 20+ and **pnpm**
- **golangci-lint** v2.9+
- **Wails** v2 (only for desktop app)

## Setup

```bash
git clone https://github.com/ZacharyZcR/NLUI.git
cd NLUI
make build        # Build server binary
make test         # Run Go tests
make lint         # Run golangci-lint
make sdk-test     # Run TypeScript engine tests
```

## Project Layout

```
cmd/nlui/       CLI & HTTP server entry point
bootstrap/      Host helper — tool discovery, router wiring
config/         YAML config types & loader
core/           LLM client, conversation manager, tool loop
engine/         Facade — single entry point for hosts
gateway/        OpenAPI spec parsing, tool building, HTTP caller
service/        Shared business logic (target/LLM/proxy CRUD)
server/         Gin HTTP server (host)
desktop/        Wails desktop app (host, separate go.mod)
mcp/            MCP server & client
sdk/            TypeScript engine, client SDKs, UI components
frontend/       Next.js chat UI
```

## Workflow

1. Fork the repo, create a branch from `main`
2. Keep changes focused on one concern
3. Run `make lint test` before pushing
4. Write or update tests for behavior changes
5. Open a PR with a clear description

## Commit Format

```
type: short description
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

## Code Style

**Go:**
- `gofmt` is enforced by pre-commit hook
- golangci-lint for additional checks
- Short functions, early returns, no dead code

**TypeScript:**
- Prefer `const` over `let`, avoid `any`

## Reporting Bugs

Use the [Bug Report](https://github.com/ZacharyZcR/NLUI/issues/new?template=bug_report.yml) template with:
- Affected component
- Steps to reproduce
- Expected vs actual behavior
- Environment details
