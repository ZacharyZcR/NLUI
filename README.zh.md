<div align="center">

# NLUI

**Natural Language User Interface**

把任意 API 变成对话式接口。

[![CI](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml/badge.svg)](https://github.com/ZacharyZcR/NLUI/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[English](README.md) | [文档站](https://zacharyzcr.github.io/NLUI/zh/)

</div>

---

NLUI 自动读取你的 OpenAPI 文档，将接口转换为 LLM 可调用的工具，让用户通过自然语言与后端交互。无需手写 prompt，无需胶水代码。

```
用户: "删除用户 zhangsan"

NLUI: 我将调用 deleteUser 接口。
      [tool_confirm: deleteUser — 等待确认]

用户: [确认]

NLUI: 完成。用户 zhangsan 已被删除。
```

## 快速开始

### 安装

```bash
# 从源码
go install github.com/ZacharyZcR/NLUI/cmd/nlui@latest

# 或从 GitHub Releases 下载
# 或 Docker
docker compose up -d
```

### 配置

```bash
cp nlui.example.yaml nlui.yaml
```

```yaml
language: zh

llm:
  api_base: http://localhost:11434/v1   # 任何 OpenAI 兼容端点
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

### 运行

```bash
go run ./cmd/nlui
```

### 对话

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "列出所有用户"}'
```

## 特性

- **OpenAPI 自动发现** — 指向你的后端，NLUI 自动构建工具
- **流式对话 (SSE)** — 实时响应，包含工具调用和确认
- **危险操作确认** — DELETE/PUT 操作需要显式批准
- **多平台** — HTTP 服务、Wails 桌面端、MCP 协议、纯 TS 引擎
- **多语言** — 支持中文、英文、日文提示词
- **SDK** — Go、TypeScript、Python、Java、Rust + React/Vue 集成

## 文档

完整文档请访问 **[zacharyzcr.github.io/NLUI](https://zacharyzcr.github.io/NLUI/zh/)**。

- [架构](https://zacharyzcr.github.io/NLUI/zh/guide/architecture)
- [配置](https://zacharyzcr.github.io/NLUI/zh/guide/configuration)
- [API 参考](https://zacharyzcr.github.io/NLUI/zh/guide/api)
- [SSE 事件](https://zacharyzcr.github.io/NLUI/zh/guide/sse-events)
- [SDK 概览](https://zacharyzcr.github.io/NLUI/zh/sdk/overview)

## 许可证

[MIT](LICENSE)
