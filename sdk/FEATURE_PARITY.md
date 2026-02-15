# SDK 功能对等性分析

对比桌面端（Wails App）和 SDK（HTTP Client）的功能差异。

## 📊 功能对比表

| 功能分类 | 桌面端方法 | HTTP Server API | SDK 支持 | 状态 |
|---------|-----------|----------------|---------|------|
| **LLM 配置** |
| 获取当前配置 | `GetCurrentConfig()` | ❌ | ❌ | 🔴 缺失 |
| 保存 LLM 配置 | `SaveLLMConfig()` | ❌ | ❌ | 🔴 缺失 |
| 探测 LLM 提供商 | `ProbeProviders()` | ❌ | ❌ | 🔴 缺失 |
| 获取模型列表 | `FetchModels()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **代理配置** |
| 测试代理 | `TestProxy()` | ❌ | ❌ | 🔴 缺失 |
| 保存代理 | `SaveProxy()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **Targets 管理** |
| 列出 Targets | `ListTargets()` | ❌ | ❌ | 🔴 缺失 |
| 添加 Target | `AddTarget()` | ❌ | ❌ | 🔴 缺失 |
| 删除 Target | `RemoveTarget()` | ❌ | ❌ | 🔴 缺失 |
| 探测 Target | `ProbeTarget()` | ❌ | ❌ | 🔴 缺失 |
| 上传 Spec 文件 | `UploadSpec()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **对话管理** |
| 列出对话 | `ListConversations()` | ✅ `/api/conversations` | ✅ | 🟢 完整 |
| 创建对话 | `CreateEmptyConversation()` | ✅ `/api/conversations` | ✅ | 🟢 完整 |
| 删除对话 | `DeleteConversation()` | ✅ `/api/conversations/:id` | ✅ | 🟢 完整 |
| 获取对话消息 | `GetConversationMessages()` | ✅ `/api/conversations/:id` | ✅ | 🟢 完整 |
| | | | | |
| **聊天功能** |
| 发送消息 | `Chat()` | ✅ `/api/chat` | ✅ | 🟢 完整 |
| 停止生成 | `StopChat()` | ❌ | ❌ | 🔴 缺失 |
| 编辑消息并重新生成 | `EditMessage()` | ❌ | ❌ | 🔴 缺失 |
| 从某处重新生成 | `RegenerateFrom()` | ❌ | ❌ | 🔴 缺失 |
| 删除消息 | `DeleteMessage()` | ❌ | ❌ | 🔴 缺失 |
| 删除从某处开始的消息 | `DeleteMessagesFrom()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **工具管理** |
| 列出所有工具 | `ListTools()` | ❌ | ❌ | 🔴 缺失 |
| 获取可用工具源 | `GetAvailableSources()` | ❌ | ❌ | 🔴 缺失 |
| 更新工具配置 | `UpdateToolConfig()` | ❌ | ❌ | 🔴 缺失 |
| 获取工具配置 | `GetToolConfig()` | ❌ | ❌ | 🔴 缺失 |
| 工具确认 | `ConfirmTool()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **系统信息** |
| 获取服务信息 | `GetInfo()` | ✅ `/api/info` | ✅ | 🟢 完整 |
| 健康检查 | ❌ | ✅ `/api/health` | ✅ | 🟢 完整 |
| 获取配置目录 | `GetConfigDir()` | ❌ | ❌ | 🔴 缺失 |
| | | | | |
| **窗口控制** |
| 设置窗口标题 | `SetWindowTitle()` | N/A | N/A | N/A |

---

## 🔍 详细分析

### ✅ **已对等的功能（7 项）**

1. **基础对话管理**
   - 列出/创建/删除对话 ✅
   - 获取对话消息 ✅

2. **聊天核心功能**
   - 发送消息（SSE 流式） ✅
   - 接收事件（content_delta, tool_call, tool_result 等） ✅

3. **服务状态**
   - 健康检查 ✅
   - 服务信息（语言、工具数量） ✅

---

### ❌ **缺失的功能（23 项）**

#### **1. LLM 配置管理（5 项）**
桌面端可以动态配置 LLM，SDK 无法：
```go
// 桌面端可以
app.SaveLLMConfig("https://api.openai.com/v1", "sk-xxx", "gpt-4")
app.ProbeProviders()  // 自动发现本地 Ollama/LM Studio
app.FetchModels("https://api.openai.com/v1", "sk-xxx")  // 获取可用模型

// SDK 不支持 ❌
```

#### **2. OpenAPI Targets 动态管理（5 项）**
**这是最核心的缺失！**

桌面端可以运行时添加/删除 OpenAPI 服务：
```go
// 桌面端可以
app.AddTarget("github", "https://api.github.com", spec, "bearer", token, "GitHub API")
app.ProbeTarget("https://api.github.com")  // 自动发现 OpenAPI spec
app.RemoveTarget("github")
app.ListTargets()  // 查看所有配置的 targets

// SDK 不支持 ❌
```

#### **3. 高级聊天功能（6 项）**
桌面端提供了更丰富的对话控制：
```go
// 桌面端可以
app.StopChat()  // 中断正在生成的回复
app.EditMessage(convID, msgIndex, "新内容")  // 编辑历史消息并重新生成
app.RegenerateFrom(convID, msgIndex)  // 从某处重新生成
app.DeleteMessage(convID, msgIndex)  // 删除单条消息
app.DeleteMessagesFrom(convID, msgIndex)  // 删除从某处开始的所有消息

// SDK 不支持 ❌
```

#### **4. 工具配置与管理（5 项）**
桌面端可以精细控制工具使用：
```go
// 桌面端可以
app.ListTools()  // 查看所有可用工具及其参数
app.GetAvailableSources()  // 查看工具来源（OpenAPI / MCP）
app.UpdateToolConfig(convID, ["github", "gitlab"], ["dangerous_tool"])  // 启用/禁用工具
app.GetToolConfig(convID)  // 查看当前对话的工具配置
app.ConfirmTool(true)  // 确认危险工具调用

// SDK 不支持 ❌
```

#### **5. 代理配置（2 项）**
```go
// 桌面端可以
app.TestProxy("http://127.0.0.1:7890")
app.SaveProxy("http://127.0.0.1:7890")

// SDK 不支持 ❌
```

---

## 🎯 **优先级建议**

### **P0 - 核心功能（必须实现）**

#### **1. Targets 动态管理 API**
```
POST   /api/targets                      # 添加 OpenAPI
GET    /api/targets                      # 列出所有 targets
DELETE /api/targets/:name                # 删除 target
POST   /api/targets/probe                # 探测 OpenAPI spec
```

**SDK 方法：**
```python
client.add_target(name, base_url, spec, auth)
client.list_targets()
client.remove_target(name)
client.probe_target(base_url)
```

#### **2. 工具管理 API**
```
GET    /api/tools                        # 列出所有工具
GET    /api/tools/sources                # 列出工具源
GET    /api/conversations/:id/tools      # 获取对话工具配置
PUT    /api/conversations/:id/tools      # 更新对话工具配置
```

**SDK 方法：**
```python
client.list_tools()
client.get_tool_sources()
client.update_tool_config(conv_id, enabled_sources, disabled_tools)
```

---

### **P1 - 高级功能（强烈推荐）**

#### **3. 消息编辑与重新生成 API**
```
PUT    /api/conversations/:id/messages/:index     # 编辑消息
POST   /api/conversations/:id/regenerate          # 重新生成
DELETE /api/conversations/:id/messages/:index     # 删除消息
POST   /api/chat/stop                             # 停止生成
```

**SDK 方法：**
```python
client.edit_message(conv_id, msg_index, new_content)
client.regenerate_from(conv_id, msg_index)
client.delete_message(conv_id, msg_index)
client.stop_chat()  # 需要支持 Server-Sent Events 的 cancel
```

#### **4. LLM 配置管理 API**
```
GET    /api/config/llm                   # 获取 LLM 配置
PUT    /api/config/llm                   # 更新 LLM 配置
GET    /api/config/llm/providers         # 探测 LLM 提供商
GET    /api/config/llm/models            # 获取模型列表
```

**SDK 方法：**
```python
client.get_llm_config()
client.update_llm_config(api_base, api_key, model)
client.probe_llm_providers()
client.fetch_models(api_base, api_key)
```

---

### **P2 - 可选功能**

#### **5. 代理配置 API**
```
GET    /api/config/proxy                 # 获取代理配置
PUT    /api/config/proxy                 # 更新代理配置
POST   /api/config/proxy/test            # 测试代理
```

---

## 📈 **实现路线图**

### **Phase 1: Targets 动态管理（1-2 天）**
- Server: 新增 `/api/targets/*` 端点
- SDK: 新增 `add_target()`, `list_targets()`, `remove_target()`, `probe_target()`
- 文档: API 说明和使用示例

**影响：** 🔥🔥🔥🔥🔥 最核心的功能，解决你提出的关键问题

### **Phase 2: 工具管理（1 天）**
- Server: 新增 `/api/tools/*` 端点
- SDK: 新增工具管理相关方法

**影响：** 🔥🔥🔥🔥 提供工具精细控制能力

### **Phase 3: 消息编辑（1-2 天）**
- Server: 新增消息编辑/重新生成端点
- SDK: 新增消息操作方法
- 需要处理 SSE cancel 机制

**影响：** 🔥🔥🔥 提升用户体验

### **Phase 4: LLM 配置（0.5 天）**
- Server: 新增 LLM 配置端点
- SDK: 新增配置管理方法

**影响：** 🔥🔥 方便动态切换模型

### **Phase 5: 代理配置（0.5 天）**
- Server: 新增代理配置端点
- SDK: 新增代理管理方法

**影响：** 🔥 特定场景需要

---

## 🚀 **总结**

### **当前状态：**
- ✅ SDK 支持基础对话功能（7 项）
- ❌ SDK 缺失高级管理功能（23 项）
- **功能对等度：** ~23% (7/30)

### **你的观点完全正确！**
SDK 应该能够提供与桌面端一致的能力。目前最大的问题是：

1. **无法动态管理 OpenAPI Targets** ← 最核心
2. **无法控制工具使用**
3. **缺少高级聊天功能**（编辑、重新生成等）

### **建议：**
**立即实现 Phase 1（Targets 动态管理）**，这将：
- 解决你提出的核心问题
- 让 SDK 真正可用
- 大幅提升功能对等度（23% → 50%+）

**需要我现在开始实现吗？** 预计 1-2 天完成 Phase 1 + Phase 2。
