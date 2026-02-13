# Configuration

NLUI uses a YAML configuration file. By default it looks for `nlui.yaml` in the current directory.

## Full Example

```yaml
language: en              # en | zh | ja

llm:
  api_base: http://localhost:11434/v1
  api_key: ""             # Optional, for cloud providers
  model: qwen2.5:7b

targets:
  - name: my-backend
    base_url: http://localhost:8080
    spec: ""              # Optional: explicit spec path
    auth:
      type: bearer        # bearer | basic | header
      token: ""
    description: ""       # Optional: human-readable description

server:
  port: 9000

proxy: ""                 # Optional: HTTP proxy (e.g. http://127.0.0.1:7890)
```

## LLM Providers

Any OpenAI-compatible endpoint works:

| Provider | API Base |
|---|---|
| Ollama | `http://localhost:11434/v1` |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Anthropic (via proxy) | Depends on proxy |

## Target Auth Types

| Type | Fields |
|---|---|
| `bearer` | `token` — sent as `Authorization: Bearer <token>` |
| `basic` | `token` — sent as `Authorization: Basic <token>` |
| `header` | `token` — sent as custom header value |

## Environment Variables

| Variable | Description |
|---|---|
| `NLUI_CONFIG` | Override config file path |
