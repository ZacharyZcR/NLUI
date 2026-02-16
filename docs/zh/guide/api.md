# API 端点

## 对话

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/chat` | POST | 流式对话 (SSE) |
| `/api/chat/stop` | POST | 停止对话 |
| `/api/chat/confirm` | POST | 确认/拒绝危险操作 |

## 会话

| 端点 | 方法 | 说明 |
|---|---|---|
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

## 目标

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/targets` | GET | 列出 API 目标 |
| `/api/targets` | POST | 添加目标 |
| `/api/targets/:name` | DELETE | 移除目标 |
| `/api/targets/probe` | POST | 自动发现 spec |

## 工具

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/tools` | GET | 列出所有工具 |
| `/api/tools/sources` | GET | 列出工具源 |
| `/api/specs/upload` | POST | 上传 OpenAPI spec 文件 |

## 配置

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/config/llm` | GET | 获取 LLM 配置 |
| `/api/config/llm` | PUT | 更新 LLM 配置 |
| `/api/config/llm/providers` | GET | 探测 LLM 提供商 |
| `/api/config/llm/models` | POST | 获取可用模型 |
| `/api/config/proxy` | GET | 获取代理配置 |
| `/api/config/proxy` | PUT | 更新代理配置 |
| `/api/config/proxy/test` | POST | 测试代理连接 |

## 健康

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 健康检查 |
| `/api/info` | GET | 服务信息 |
