# Contributing to NLUI

Thank you for your interest in contributing! This document covers the basics.

[中文版见下方](#贡献指南)

---

## Getting Started

### Prerequisites

- **Go** 1.25+
- **Node.js** 20+ and **pnpm** (for SDK / frontend)
- **golangci-lint** v2.9+ (for linting)
- **Wails** v2 (only if building the desktop app)

### Clone & Build

```bash
git clone https://github.com/ZacharyZcR/NLUI.git
cd NLUI
make build        # builds the server binary
make test         # runs Go tests
make lint         # runs golangci-lint
```

### Project Layout

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

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/ZacharyZcR/NLUI/issues/new?template=bug_report.yml) template. Include:

- Which component is affected
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Go/Node version)

### Suggesting Features

Use the [Feature Request](https://github.com/ZacharyZcR/NLUI/issues/new?template=feature_request.yml) template.

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes — keep the diff focused on one concern
3. Ensure `make lint test` passes
4. Write or update tests if you change behavior
5. Open a PR with a clear description of *what* and *why*

### Commit Messages

Follow this format:

```
type: short description

Optional body explaining the "why".
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

Examples:
- `feat: add proxy health check endpoint`
- `fix: nil slice causing frontend crash`
- `refactor: extract service layer for shared logic`

### Code Style

**Go:**
- `gofmt` is the standard — no debate
- golangci-lint enforces additional checks (see `.golangci.yml`)
- Keep functions short. Avoid deep nesting. Prefer early returns
- No dead code, no commented-out blocks

**TypeScript:**
- ESLint config at `frontend/eslint.config.mjs`
- Prefer `const` over `let`. Avoid `any`

### Testing

- New business logic should come with tests
- Run `make test` (Go) and `make sdk-test` (TypeScript engine) before pushing
- Don't break existing tests

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful.

---

# 贡献指南

感谢你对 NLUI 的关注！

## 环境准备

- **Go** 1.25+
- **Node.js** 20+ & **pnpm**（SDK / 前端）
- **golangci-lint** v2.9+
- **Wails** v2（仅桌面端需要）

```bash
git clone https://github.com/ZacharyZcR/NLUI.git
cd NLUI
make build        # 构建服务端二进制
make test         # 运行 Go 测试
make lint         # 运行 golangci-lint
```

## 如何参与

### 报告 Bug

使用 [Bug Report](https://github.com/ZacharyZcR/NLUI/issues/new?template=bug_report.yml) 模板，尽量包含复现步骤和环境信息。

### 提交 PR

1. Fork 仓库，从 `main` 创建分支
2. 改动聚焦单一关注点，不要混杂无关修改
3. 确保 `make lint test` 通过
4. 行为变更需补充或更新测试
5. PR 描述清楚"改了什么"和"为什么改"

### Commit 格式

```
类型: 简短描述

可选的正文，解释"为什么"。
```

类型：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`ci`

### 代码风格

- Go 以 `gofmt` + `golangci-lint` 为准
- 函数短小、避免深层嵌套、优先 early return
- 不留死代码、不留注释掉的代码块

### 行为准则

本项目遵循 [Contributor Covenant](CODE_OF_CONDUCT.md)。请保持尊重。
