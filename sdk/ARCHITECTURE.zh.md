# NLUI SDK 架构与 OpenAPI 接入方案

## 🏗️ 当前架构

### **静态配置模式（当前实现）**

```
┌────────────────┐
│  nlui.yaml     │  配置文件：定义所有 OpenAPI targets
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  NLUI Server   │  启动时加载 targets，转换为 LLM tools
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  SDK (Client)  │  通过 HTTP 调用预配置的工具
└────────────────┘
```

**限制：**
- ❌ 无法运行时添加新的 OpenAPI 服务
- ❌ 修改 targets 需要重启服务器
- ❌ SDK 无法控制工具来源

---

## ✅ 解决方案：3 种接入模式

### **模式 1: 动态 Targets API**（推荐用于生产）

添加 REST API 端点动态管理 OpenAPI targets：

```
POST   /api/targets          # 添加新的 OpenAPI 服务
GET    /api/targets          # 列出所有 targets
DELETE /api/targets/:name    # 删除 target
POST   /api/targets/:name/reload  # 重新加载 target 的工具
```

**架构：**
```
┌────────────────┐
│  SDK (Client)  │
└───────┬────────┘
        │ 1. 动态添加 OpenAPI
        ▼
┌────────────────┐
│ POST /api/targets │
│ {                 │
│   name: "my-api", │
│   spec: "url",    │
│   base_url: "..." │
│ }                 │
└───────┬────────┘
        │ 2. NLUI 实时加载工具
        ▼
┌────────────────┐
│  NLUI Engine   │  工具池动态更新
└───────┬────────┘
        │ 3. 使用新工具
        ▼
┌────────────────┐
│  OpenAPI 服务  │
└────────────────┘
```

**SDK 使用示例：**
```python
from nlui import NLUIClient

client = NLUIClient()

# 动态添加 OpenAPI 服务
client.add_target(
    name="user-api",
    base_url="https://api.company.com",
    spec="https://api.company.com/openapi.json",
    auth_type="bearer",
    token="xxx"
)

# 立即可用
client.chat("查询用户 zhangsan 的信息")

# 移除 target
client.remove_target("user-api")
```

---

### **模式 2: Go 嵌入式模式**（已支持）

直接在 Go 代码中嵌入 NLUI 引擎，无需 HTTP Server：

```go
import (
    "github.com/ZacharyZcR/NLUI/config"
    "github.com/ZacharyZcR/NLUI/engine"
    "github.com/ZacharyZcR/NLUI/bootstrap"
)

// 配置 targets
cfg := &config.Config{
    Language: "zh",
    LLM: config.LLMConfig{
        APIBase: "http://localhost:11434/v1",
        Model:   "qwen2.5:7b",
    },
    Targets: []config.Target{
        {
            Name:    "my-api",
            BaseURL: "https://api.company.com",
            Spec:    "https://api.company.com/openapi.json",
        },
    },
}

// 初始化
res, _ := bootstrap.Run(cfg, nil)
defer res.Close()

// 创建引擎
eng := engine.New(engine.Config{
    LLM:          llm.NewClient(cfg.LLM.APIBase, cfg.LLM.APIKey, cfg.LLM.Model, ""),
    Executor:     res.Router,
    Tools:        res.Tools,
    SystemPrompt: res.SystemPrompt,
})

// 使用
eng.Chat(ctx, "", "查询用户信息", "", eventHandler)
```

**优势：**
- ✅ 完全控制，无 HTTP 开销
- ✅ 可以在代码中动态构造 targets
- ✅ 适合嵌入到其他 Go 应用

**限制：**
- ❌ 仅限 Go 语言

---

### **模式 3: SDK 内置 Engine**（未来计划）

在 Python/JS SDK 中直接嵌入轻量级引擎：

```python
from nlui import EmbeddedNLUI

# 无需 NLUI Server
nlui = EmbeddedNLUI(
    llm_url="http://localhost:11434/v1",
    llm_model="qwen2.5:7b"
)

# 直接添加 OpenAPI
nlui.add_openapi(
    name="my-api",
    spec_url="https://api.company.com/openapi.json"
)

# 使用
nlui.chat("查询用户信息")
```

**优势：**
- ✅ 无需部署 NLUI Server
- ✅ 完全自包含
- ✅ 适合快速原型

**限制：**
- ❌ 需要用其他语言重写核心引擎（复杂）
- ❌ 或者通过 WASM/FFI 调用 Go 引擎（性能开销）

---

## 🎯 推荐方案

根据不同使用场景：

### **场景 1: 生产环境 / 多人协作**
→ **静态配置 + 动态 API**
- 核心 targets 在 `nlui.yaml` 中配置
- 临时/测试 targets 通过 API 动态添加
- SDK: `client.add_target()`

### **场景 2: Go 应用集成**
→ **嵌入式模式**
- 直接在 Go 代码中配置所有内容
- 无需额外的 HTTP Server
- 最高性能

### **场景 3: 快速原型 / 单机开发**
→ **静态配置文件**
- 简单的 `nlui.yaml`
- 启动 NLUI Server
- SDK 连接使用

---

## 🔄 实现优先级

### **Phase 1: 动态 Targets API**（高优先级）

新增 API 端点：
- `POST /api/targets` - 添加 target
- `GET /api/targets` - 列出 targets
- `DELETE /api/targets/:name` - 删除 target

SDK 新增方法：
```python
# Python
client.add_target(name, base_url, spec, auth)
client.list_targets()
client.remove_target(name)

# JavaScript
await client.addTarget({name, baseURL, spec, auth})
await client.listTargets()
await client.removeTarget(name)

# Go
client.AddTarget(ctx, target)
client.ListTargets(ctx)
client.RemoveTarget(ctx, name)
```

### **Phase 2: 文件上传支持**

允许直接上传 OpenAPI spec 文件：
```python
client.add_target_from_file(
    name="my-api",
    spec_file="./openapi.yaml",
    base_url="https://api.company.com"
)
```

### **Phase 3: SDK 内置引擎**（低优先级）

探索跨语言方案：
- Option A: WASM 版本的 NLUI Engine
- Option B: gRPC 服务模式
- Option C: 各语言独立实现（维护成本高）

---

## 📊 对比总结

| 特性 | 静态配置 | 动态 API | Go 嵌入式 | SDK 内置 |
|------|---------|---------|----------|---------|
| 运行时添加 targets | ❌ | ✅ | ✅ | ✅ |
| 无需重启 | ❌ | ✅ | N/A | N/A |
| 跨语言支持 | ✅ | ✅ | ❌ | ✅ |
| 性能 | 高 | 高 | 最高 | 中 |
| 复杂度 | 低 | 中 | 低 | 高 |
| 维护成本 | 低 | 中 | 低 | 高 |

---

## 🚀 立即可用的方案

**对于 Go 用户：**
使用嵌入式模式，已完全支持动态配置。参考：`sdk/go/`

**对于 Python/JS 用户：**
等待 Phase 1 实现（动态 Targets API），预计 1-2 天可完成。

**临时方案：**
修改 `nlui.yaml` 后重启 NLUI Server。
