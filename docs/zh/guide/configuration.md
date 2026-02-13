# 配置

NLUI 使用 YAML 配置文件，默认在当前目录查找 `nlui.yaml`。

## 完整示例

```yaml
language: zh              # en | zh | ja

llm:
  api_base: http://localhost:11434/v1
  api_key: ""             # 可选，用于云服务商
  model: qwen2.5:7b

targets:
  - name: my-backend
    base_url: http://localhost:8080
    spec: ""              # 可选：显式 spec 路径
    auth:
      type: bearer        # bearer | basic | header
      token: ""
    description: ""       # 可选：可读描述

server:
  port: 9000

proxy: ""                 # 可选：HTTP 代理（如 http://127.0.0.1:7890）
```

## LLM 提供商

任何 OpenAI 兼容端点都可以使用：

| 提供商 | API Base |
|---|---|
| Ollama | `http://localhost:11434/v1` |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Anthropic（通过代理） | 取决于代理 |

## Target 认证类型

| 类型 | 字段 |
|---|---|
| `bearer` | `token` — 以 `Authorization: Bearer <token>` 发送 |
| `basic` | `token` — 以 `Authorization: Basic <token>` 发送 |
| `header` | `token` — 作为自定义 header 值发送 |

## 环境变量

| 变量 | 说明 |
|---|---|
| `NLUI_CONFIG` | 覆盖配置文件路径 |
