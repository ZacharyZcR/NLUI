# SSE Events

`POST /api/chat` returns a Server-Sent Events stream.

## Event Flow

```
← event: session         {"session_id":"abc123"}
← event: content_delta   {"delta":"Sure, "}
← event: tool_call       {"name":"deleteUser","arguments":"..."}
← event: tool_confirm    {"session_id":"abc123","name":"deleteUser","arguments":"..."}
→ POST /api/chat/confirm {"session_id":"abc123","approved":true}
← event: tool_result     {"name":"deleteUser","result":"..."}
← event: done            {"conversation_id":"conv456"}
```

## Event Types

| Event | Description |
|---|---|
| `session` | Session created. Contains `session_id` for stop/confirm. |
| `content_delta` | Partial text from the LLM. Concatenate deltas for full response. |
| `tool_call` | LLM is calling a tool. Contains `name` and `arguments`. |
| `tool_confirm` | Dangerous tool needs approval. Send confirm/reject to `/api/chat/confirm`. |
| `tool_result` | Tool execution result. Contains `name` and `result`. |
| `error` | An error occurred. Contains `message`. |
| `done` | Stream complete. Contains `conversation_id` for follow-up messages. |

## Confirmation Flow

When a tool is marked as dangerous (DELETE, PUT, etc.), NLUI pauses and emits `tool_confirm`:

1. Client receives `tool_confirm` event
2. Client shows confirmation UI to user
3. Client sends `POST /api/chat/confirm` with `approved: true/false`
4. If approved, tool executes and stream continues
5. If rejected, LLM is informed and may suggest alternatives
