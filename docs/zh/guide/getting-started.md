# 快速开始

## NLUI 是什么？

NLUI 自动读取你的 OpenAPI 文档，将接口转换为 LLM 可调用的工具，让用户通过自然语言与后端交互。

```
用户: "删除用户 zhangsan"

NLUI: 我将调用 deleteUser 接口。
      [tool_confirm: deleteUser — 等待确认]

用户: [确认]

NLUI: 完成。用户 zhangsan 已被删除。
```

## 安装

### 下载发布版

从 [GitHub Releases](https://github.com/ZacharyZcR/NLUI/releases) 下载预编译二进制。

### 从源码

```bash
go install github.com/ZacharyZcR/NLUI/cmd/nlui@latest
```

### Docker

```bash
docker compose up -d
```

## 配置

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
    base_url: http://localhost:8080      # NLUI 自动发现 /swagger/doc.json
    auth:
      type: bearer
      token: ""

server:
  port: 9000
```

## 运行

```bash
# HTTP 服务
go run ./cmd/nlui

# MCP stdio 模式（用于 Claude Desktop 等）
go run ./cmd/nlui --mcp

# 桌面应用（需要 Wails）
cd desktop && wails dev
```

## 对话

```bash
curl -N http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "列出所有用户"}'
```
