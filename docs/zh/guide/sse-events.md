# SSE 事件

`POST /api/chat` 返回 Server-Sent Events 流。

## 事件流

```
← event: session         {"session_id":"abc123"}
← event: content_delta   {"delta":"好的，"}
← event: tool_call       {"name":"deleteUser","arguments":"..."}
← event: tool_confirm    {"session_id":"abc123","name":"deleteUser","arguments":"..."}
→ POST /api/chat/confirm {"session_id":"abc123","approved":true}
← event: tool_result     {"name":"deleteUser","result":"..."}
← event: done            {"conversation_id":"conv456"}
```

## 事件类型

| 事件 | 说明 |
|---|---|
| `session` | 会话已创建。包含 `session_id` 用于停止/确认。 |
| `content_delta` | LLM 的部分文本。拼接所有 delta 获得完整响应。 |
| `tool_call` | LLM 正在调用工具。包含 `name` 和 `arguments`。 |
| `tool_confirm` | 危险工具需要批准。发送确认/拒绝到 `/api/chat/confirm`。 |
| `tool_result` | 工具执行结果。包含 `name` 和 `result`。 |
| `error` | 发生错误。包含 `message`。 |
| `done` | 流结束。包含 `conversation_id` 用于后续消息。 |

## 确认流程

当工具被标记为危险（DELETE、PUT 等），NLUI 会暂停并发出 `tool_confirm`：

1. 客户端收到 `tool_confirm` 事件
2. 客户端向用户展示确认 UI
3. 客户端发送 `POST /api/chat/confirm`，`approved: true/false`
4. 批准则执行工具，流继续
5. 拒绝则通知 LLM，LLM 可能建议替代方案
