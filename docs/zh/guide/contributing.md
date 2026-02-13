# 贡献指南

## 环境要求

- **Go** 1.25+
- **Node.js** 20+ 和 **pnpm**
- **golangci-lint** v2.9+
- **Wails** v2（仅桌面应用需要）

## 搭建

```bash
git clone https://github.com/ZacharyZcR/NLUI.git
cd NLUI
make build        # 构建服务端二进制
make test         # 运行 Go 测试
make lint         # 运行 golangci-lint
make sdk-test     # 运行 TypeScript 引擎测试
```

## 项目结构

```
cmd/nlui/       CLI 和 HTTP 服务入口
bootstrap/      宿主助手 — 工具发现、路由接线
config/         YAML 配置类型和加载器
core/           LLM 客户端、会话管理、工具循环
engine/         门面层 — 宿主唯一入口
gateway/        OpenAPI spec 解析、工具构建、HTTP 调用
service/        共享业务逻辑（Target/LLM/Proxy CRUD）
server/         Gin HTTP 服务（宿主）
desktop/        Wails 桌面应用（宿主，独立 go.mod）
mcp/            MCP 服务端和客户端
sdk/            TypeScript 引擎、客户端 SDK、UI 组件
frontend/       Next.js 聊天 UI
```

## 工作流程

1. Fork 仓库，从 `main` 创建分支
2. 改动聚焦单一关注点
3. 推送前运行 `make lint test`
4. 行为变更需补充或更新测试
5. 提交 PR 并附上清晰的描述

## Commit 格式

```
type: 简短描述
```

类型：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`ci`

## 代码风格

**Go：**
- `gofmt` 由 pre-commit hook 强制执行
- golangci-lint 做额外检查
- 函数短小、early return、不留死代码

**TypeScript：**
- 优先 `const`，避免 `any`

## 报告 Bug

使用 [Bug Report](https://github.com/ZacharyZcR/NLUI/issues/new?template=bug_report.yml) 模板，包含：
- 受影响的组件
- 复现步骤
- 预期与实际行为
- 环境信息
