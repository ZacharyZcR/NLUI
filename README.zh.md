<div align="center">

# NLUI

**Natural Language User Interface**

把任意 API 变成对话式接口。

[![CI](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[English](README.md)

</div>

---

## NLUI 是什么？

NLUI 自动读取你的 OpenAPI 文档，将接口转换为 LLM 可调用的工具，让用户通过自然语言与后端交互。无需手写 prompt，无需胶水代码。

```
用户: "删除用户 zhangsan"

NLUI: 我将调用 deleteUser 接口。
      [tool_confirm: deleteUser — 等待确认]

用户: [确认]

NLUI: 完成。用户 zhangsan 已被删除。
```

## 架构

```
┌─────────────────────────────────────────────────┐
│                     宿主层                        │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  桌面端    │  │ HTTP 服务  │  │  MCP 服务    │  │
│  │  (Wails)   │  │  (Gin)    │  │ (stdio/SSE) │  │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│        └───────────────┼───────────────┘         │
│                   ┌────┴────┐                    │
│                   │ engine  │  ← 唯一入口         │
│                   └────┬────┘                    │
│        ┌───────────────┼───────────────┐         │
│   ┌────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐  │
│   │toolloop │   │conversation │  │    llm     │  │
│   └─────────┘   └─────────────┘  └───────────┘  │
│                      core/                       │
├─────────────────────────────────────────────────┤
│   gateway (OpenAPI)       mcp (MCP 协议)          │
│   bootstrap (初始化助手)                           │
└─────────────────────────────────────────────────┘
```

- **core/** — 纯逻辑层：工具循环、会话管理、LLM 客户端。零外部依赖。
- **engine/** — 宿主唯一入口，隔离 core 内部实现。
- **gateway/** — 解析 OpenAPI spec，构建 LLM 工具定义，执行 HTTP 调用。
- **mcp/** — 双向 MCP 支持：对外暴露工具或消费外部 MCP 服务。
- **bootstrap/** — 初始化助手：发现工具、构建系统提示词、连接各组件。

## 快速开始

### 1. 配置

```bash
cp nlui.example.yaml kelper.yaml
```

```yaml
language: zh

llm:
  api_base: http://localhost:11434/v1   # 任何 OpenAI 兼容端点
  model: qwen2.5:7b

targets:
  - name: my-backend
    base_url: http://localhost:8080      # NLUI 自动发现 /swagger/doc.json
    auth:
      type: bearer
      token: ""

server:
  port: 9000
```

### 2. 运行

```bash
# HTTP 服务
go run ./cmd/nlui

# MCP stdio 模式（用于 Claude Desktop 等）
go run ./cmd/nlui --mcp

# 桌面应用（需要 Wails）
cd desktop && wails dev
```

### 3. 对话

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "列出所有用户"}'
```

## 功能矩阵

| 功能 | HTTP 服务 | 桌面端 | SDK |
|---|:---:|:---:|:---:|
| 流式对话 (SSE) | ✓ | ✓ | ✓ |
| OpenAPI 自动发现 | ✓ | ✓ | — |
| 危险操作确认 | ✓ | ✓ | ✓ |
| 停止生成 | ✓ | ✓ | ✓ |
| Spec 文件上传 | ✓ | ✓ | ✓ |
| 会话管理 | ✓ | ✓ | ✓ |
| 按会话工具过滤 | ✓ | ✓ | ✓ |
| 消息编辑与重新生成 | ✓ | ✓ | ✓ |
| MCP 服务端 / 客户端 | ✓ | ✓ | — |
| 多语言提示词 (zh/en/ja) | ✓ | ✓ | — |

## SDK

### 客户端 SDK

| 语言 | 包名 | 安装 |
|---|---|---|
| Go | `sdk/go` | `go get github.com/ZacharyZcR/NLUI/sdk/go` |
| TypeScript | `@nlui/client` | `npm install @nlui/client` |
| Python | `nlui` | `pip install nlui` |
| Java | `nlui-sdk` | Maven 依赖 |
| Rust | `nlui` | `cargo add nlui` |

### 框架集成

| 框架 | 包名 | 说明 |
|---|---|---|
| React | `@nlui/react` | Hooks: `useNLUI()` |
| Vue 3 | `@nlui/vue` | Composables: `useNLUI()` |
| Web Components | `@nlui/components` | 框架无关 `<nlui-chat>` |
| React UI | `@nlui/react-ui` | 开箱即用的聊天组件 |
| Vue UI | `@nlui/vue-ui` | 开箱即用的聊天组件 |

### 纯 TypeScript 引擎

`@nlui/engine` — 完整的 NLUI 引擎 TypeScript 实现，零后端依赖，可完全在浏览器中运行。

```ts
import { createEngine } from "@nlui/engine";
import { useEngine } from "@nlui/engine/react";
```

## API 参考

### 对话 (SSE)

```
POST /api/chat
```

SSE 事件流：

```
← event: session         {"session_id":"abc123"}
← event: content_delta   {"delta":"好的，"}
← event: tool_call       {"name":"deleteUser","arguments":"..."}
← event: tool_confirm    {"session_id":"abc123","name":"deleteUser","arguments":"..."}
→ POST /api/chat/confirm {"session_id":"abc123","approved":true}
← event: tool_result     {"name":"deleteUser","result":"..."}
← event: done            {"conversation_id":"conv456"}
```

### 会话控制

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/chat/stop` | POST | 取消进行中的对话 |
| `/api/chat/confirm` | POST | 确认/拒绝危险操作 |
| `/api/specs/upload` | POST | 上传 OpenAPI spec 文件 |

### 完整路由列表

<details>
<summary>所有路由</summary>

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 健康检查 |
| `/api/info` | GET | 服务信息 |
| `/api/chat` | POST | 流式对话 (SSE) |
| `/api/chat/stop` | POST | 停止对话 |
| `/api/chat/confirm` | POST | 工具确认 |
| `/api/specs/upload` | POST | 上传 OpenAPI spec |
| `/api/conversations` | GET | 列出会话 |
| `/api/conversations` | POST | 创建会话 |
| `/api/conversations/:id` | GET | 获取会话 |
| `/api/conversations/:id` | DELETE | 删除会话 |
| `/api/conversations/:id/messages/:index` | PUT | 编辑消息并重新生成 |
| `/api/conversations/:id/messages/:index` | DELETE | 删除消息 |
| `/api/conversations/:id/messages/:index/from` | DELETE | 从索引删除消息 |
| `/api/conversations/:id/regenerate` | POST | 从索引重新生成 |
| `/api/conversations/:id/tools` | GET | 获取工具配置 |
| `/api/conversations/:id/tools` | PUT | 更新工具配置 |
| `/api/targets` | GET | 列出 API 目标 |
| `/api/targets` | POST | 添加目标 |
| `/api/targets/:name` | DELETE | 移除目标 |
| `/api/targets/probe` | POST | 自动发现 spec |
| `/api/tools` | GET | 列出所有工具 |
| `/api/tools/sources` | GET | 列出工具源 |
| `/api/config/llm` | GET | 获取 LLM 配置 |
| `/api/config/llm` | PUT | 更新 LLM 配置 |
| `/api/config/llm/providers` | GET | 探测 LLM 提供商 |
| `/api/config/llm/models` | POST | 获取可用模型 |
| `/api/config/proxy` | GET | 获取代理配置 |
| `/api/config/proxy` | PUT | 更新代理配置 |
| `/api/config/proxy/test` | POST | 测试代理连接 |

</details>

## 项目结构

```
.
├── bootstrap/          # 初始化助手
├── cmd/
│   ├── nlui/           # 主入口
│   └── dump/           # 工具定义导出器
├── config/             # YAML 配置管理
├── core/
│   ├── llm/            # OpenAI 兼容 LLM 客户端
│   ├── conversation/   # 会话管理器（内存 + 磁盘持久化）
│   └── toolloop/       # 核心工具调用循环
├── desktop/            # Wails 桌面应用（独立 go.mod）
├── engine/             # 宿主门面层
├── frontend/           # Next.js 16 + React 19 Web UI
├── gateway/            # OpenAPI spec → LLM 工具
├── mcp/                # MCP 协议（服务端 + 客户端）
├── sdk/
│   ├── go/             # Go SDK
│   ├── js/             # TypeScript SDK (@nlui/client)
│   ├── python/         # Python SDK
│   ├── java/           # Java SDK
│   ├── rust/           # Rust SDK
│   ├── engine/         # 纯 TS 引擎 (@nlui/engine)
│   ├── react/          # React Hooks (@nlui/react)
│   ├── vue/            # Vue Composables (@nlui/vue)
│   ├── components/     # Web Components (@nlui/components)
│   ├── react-ui/       # React 聊天 UI (@nlui/react-ui)
│   ├── vue-ui/         # Vue 聊天 UI (@nlui/vue-ui)
│   └── examples/       # 使用示例（6 种语言）
├── server/             # HTTP 服务 (Gin)
└── nlui.example.yaml   # 示例配置
```

## 许可证

[MIT](LICENSE)
