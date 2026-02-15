# NLUI SDK

NLUI 提供多种 SDK 和接入方式，满足不同技术栈的需求。

## 📦 可用的 SDK

### 1. JavaScript/TypeScript SDK (`@nlui/client`)

纯 JavaScript SDK，适用于浏览器和 Node.js 环境。

**安装：**
```bash
npm install @nlui/client
# 或
yarn add @nlui/client
```

**使用示例：**
```typescript
import NLUIClient from '@nlui/client';

const client = new NLUIClient({
  baseURL: 'http://localhost:9000',
  apiKey: 'your-api-key', // 可选
});

// 健康检查
const health = await client.health();
console.log('Tools available:', health.tools);

// 发送消息（SSE 流式）
await client.chat('你好，介绍一下自己', {
  onEvent: (event) => {
    if (event.type === 'content_delta') {
      process.stdout.write(event.data.delta);
    }
  },
  onDone: (conversationId) => {
    console.log('\nConversation ID:', conversationId);
  },
});
```

---

### 2. React Hooks (`@nlui/react`)

专为 React 应用设计的 Hooks，开箱即用。

**安装：**
```bash
npm install @nlui/react
```

**使用示例：**
```tsx
import { useNLUI, useChat } from '@nlui/react';

function ChatApp() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const { messages, send, isLoading } = useChat(client);

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <button onClick={() => send('Hello')} disabled={isLoading}>
        发送
      </button>
    </div>
  );
}
```

**可用 Hooks：**
- `useNLUI(config)` - 创建客户端实例
- `useChat(client, options)` - 管理聊天状态
- `useConversations(client)` - 管理对话列表

---

### 3. Go SDK (`github.com/ZacharyZcR/NLUI/sdk/go`)

纯 Go 标准库实现，无外部依赖。

**安装：**
```bash
go get github.com/ZacharyZcR/NLUI/sdk/go
```

**使用示例：**
```go
import nluisdk "github.com/ZacharyZcR/NLUI/sdk/go"

client := nluisdk.NewClient("http://localhost:9000")

// 发送消息
err := client.Chat(ctx, "你好", nluisdk.ChatOptions{
    OnEvent: func(event nluisdk.ChatEvent) {
        // 处理事件
    },
    OnDone: func(conversationID string) {
        fmt.Println("Done:", conversationID)
    },
})
```

---

## 🚀 快速开始

### 方式 1: HTTP 服务器模式（推荐用于生产）

启动 NLUI HTTP 服务器：
```bash
./nlui nlui.yaml
```

然后使用任意 SDK 连接到 `http://localhost:9000`。

### 方式 2: Go 嵌入式模式

直接在你的 Go 应用中嵌入 NLUI 引擎：

```go
import (
    "github.com/ZacharyZcR/NLUI/config"
    "github.com/ZacharyZcR/NLUI/engine"
    "github.com/ZacharyZcR/NLUI/bootstrap"
)

// 加载配置
cfg, _ := config.Load("nlui.yaml")

// 初始化
res, _ := bootstrap.Run(cfg, nil)
defer res.Close()

// 创建引擎实例
eng := engine.New(engine.Config{
    LLM:          llm.NewClient(cfg.LLM.APIBase, cfg.LLM.APIKey, cfg.LLM.Model, cfg.Proxy),
    Executor:     res.Router,
    Tools:        res.Tools,
    SystemPrompt: res.SystemPrompt,
})

// 使用引擎
eng.Chat(ctx, "", "你好", "", func(event engine.Event) {
    // 处理事件
})
```

### 方式 3: MCP 协议模式

将 NLUI 作为 MCP Server 集成到其他 AI 应用（如 Claude Desktop）：

```bash
# Stdio 模式
./nlui --mcp nlui.yaml

# SSE 模式
./nlui --mcp-sse 3000 nlui.yaml
```

然后在 Claude Desktop 配置中添加：
```json
{
  "mcpServers": {
    "nlui": {
      "command": "/path/to/nlui",
      "args": ["--mcp", "/path/to/nlui.yaml"]
    }
  }
}
```

---

## 📡 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/info` | 获取服务信息（语言、工具数） |
| POST | `/api/chat` | 发送消息（SSE 流式响应） |
| GET | `/api/conversations` | 列出所有对话 |
| POST | `/api/conversations` | 创建新对话 |
| GET | `/api/conversations/:id` | 获取对话详情 |
| DELETE | `/api/conversations/:id` | 删除对话 |

---

## 🎯 SSE 事件类型

`/api/chat` 端点返回的 Server-Sent Events：

| 事件类型 | 数据格式 | 说明 |
|---------|---------|------|
| `content_delta` | `{"delta": "文本"}` | 流式文本增量 |
| `content` | `{"text": "完整文本"}` | 完整文本块 |
| `tool_call` | `{"name": "工具名", "arguments": "{}"}` | 工具调用 |
| `tool_result` | `{"name": "工具名", "result": "结果"}` | 工具执行结果 |
| `usage` | `{"total_tokens": 123}` | Token 使用统计 |
| `error` | `{"error": "错误信息"}` | 错误事件 |
| `done` | `{"conversation_id": "xxx"}` | 对话完成 |

---

## 🔧 完整示例

查看 `examples/` 目录获取完整的可运行示例：

- `vanilla-js.html` - 纯 JavaScript 浏览器示例
- `react-example.tsx` - React + Hooks 示例
- `go-example.go` - Go SDK 完整示例

---

## 🏗️ 架构设计

```
┌─────────────┐
│   你的应用   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│       NLUI SDK 层            │
│  (JS / React / Go / ...)    │
└──────────┬──────────────────┘
           │ HTTP / SSE
           ▼
┌─────────────────────────────┐
│    NLUI HTTP Server         │
│    (Gin + SSE)              │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│      Engine (核心引擎)       │
│  - Tool Loop                │
│  - Conversation Manager     │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌──────────┐
│ OpenAPI │  │   MCP    │
│ Gateway │  │ Clients  │
└─────────┘  └──────────┘
     │           │
     ▼           ▼
  [APIs]     [MCP Tools]
```

---

## 📝 License

MIT License - 详见 LICENSE 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

仓库地址：https://github.com/ZacharyZcR/NLUI
