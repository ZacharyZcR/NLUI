# API Endpoints

## Chat

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | Streaming chat (SSE) |
| `/api/chat/stop` | POST | Stop active chat |
| `/api/chat/confirm` | POST | Approve/reject dangerous tool |

## Conversations

| Endpoint | Method | Description |
|---|---|---|
| `/api/conversations` | GET | List conversations |
| `/api/conversations` | POST | Create conversation |
| `/api/conversations/:id` | GET | Get conversation |
| `/api/conversations/:id` | DELETE | Delete conversation |
| `/api/conversations/:id/messages/:index` | PUT | Edit message & regenerate |
| `/api/conversations/:id/messages/:index` | DELETE | Delete message |
| `/api/conversations/:id/messages/:index/from` | DELETE | Delete messages from index |
| `/api/conversations/:id/regenerate` | POST | Regenerate from index |
| `/api/conversations/:id/tools` | GET | Get tool config |
| `/api/conversations/:id/tools` | PUT | Update tool config |

## Targets

| Endpoint | Method | Description |
|---|---|---|
| `/api/targets` | GET | List API targets |
| `/api/targets` | POST | Add target |
| `/api/targets/:name` | DELETE | Remove target |
| `/api/targets/probe` | POST | Auto-discover spec |

## Tools

| Endpoint | Method | Description |
|---|---|---|
| `/api/tools` | GET | List all tools |
| `/api/tools/sources` | GET | List tool sources |
| `/api/specs/upload` | POST | Upload OpenAPI spec file |

## Config

| Endpoint | Method | Description |
|---|---|---|
| `/api/config/llm` | GET | Get LLM config |
| `/api/config/llm` | PUT | Update LLM config |
| `/api/config/llm/providers` | GET | Probe LLM providers |
| `/api/config/llm/models` | POST | Fetch available models |
| `/api/config/proxy` | GET | Get proxy config |
| `/api/config/proxy` | PUT | Update proxy config |
| `/api/config/proxy/test` | POST | Test proxy connection |

## Health

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/info` | GET | Server info |
