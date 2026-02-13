# NLUI SDK Architecture & OpenAPI Integration

## Current Architecture

### **Static Configuration Mode (Current Implementation)**

```
┌────────────────┐
│  nlui.yaml     │  Config file: defines all OpenAPI targets
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  NLUI Server   │  Loads targets at startup, converts to LLM tools
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  SDK (Client)  │  Calls pre-configured tools via HTTP
└────────────────┘
```

**Limitations:**
- No runtime addition of new OpenAPI services
- Modifying targets requires server restart
- SDK cannot control tool sources

---

## Solution: 3 Integration Modes

### **Mode 1: Dynamic Targets API** (Recommended for production)

Add REST API endpoints for dynamic OpenAPI target management:

```
POST   /api/targets          # Add a new OpenAPI service
GET    /api/targets          # List all targets
DELETE /api/targets/:name    # Remove a target
POST   /api/targets/:name/reload  # Reload a target's tools
```

**Architecture:**
```
┌────────────────┐
│  SDK (Client)  │
└───────┬────────┘
        │ 1. Dynamically add OpenAPI
        ▼
┌────────────────┐
│ POST /api/targets │
│ {                 │
│   name: "my-api", │
│   spec: "url",    │
│   base_url: "..." │
│ }                 │
└───────┬────────┘
        │ 2. NLUI loads tools in real-time
        ▼
┌────────────────┐
│  NLUI Engine   │  Tool pool updates dynamically
└───────┬────────┘
        │ 3. Use new tools
        ▼
┌────────────────┐
│  OpenAPI Service│
└────────────────┘
```

**SDK Usage Example:**
```python
from nlui import NLUIClient

client = NLUIClient()

# Dynamically add an OpenAPI service
client.add_target(
    name="user-api",
    base_url="https://api.company.com",
    spec="https://api.company.com/openapi.json",
    auth_type="bearer",
    token="xxx"
)

# Ready to use immediately
client.chat("Query user zhangsan's information")

# Remove target
client.remove_target("user-api")
```

---

### **Mode 2: Go Embedded Mode** (Supported)

Embed the NLUI engine directly in Go code, no HTTP Server needed:

```go
import (
    "github.com/ZacharyZcR/NLUI/config"
    "github.com/ZacharyZcR/NLUI/engine"
    "github.com/ZacharyZcR/NLUI/bootstrap"
)

// Configure targets
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

// Initialize
res, _ := bootstrap.Run(cfg, nil)
defer res.Close()

// Create engine
eng := engine.New(engine.Config{
    LLM:          llm.NewClient(cfg.LLM.APIBase, cfg.LLM.APIKey, cfg.LLM.Model, ""),
    Executor:     res.Router,
    Tools:        res.Tools,
    SystemPrompt: res.SystemPrompt,
})

// Use
eng.Chat(ctx, "", "Query user information", "", eventHandler)
```

**Advantages:**
- Full control, no HTTP overhead
- Targets can be constructed dynamically in code
- Ideal for embedding into other Go applications

**Limitations:**
- Go language only

---

### **Mode 3: SDK Built-in Engine** (Future Plan)

Embed a lightweight engine directly in Python/JS SDKs:

```python
from nlui import EmbeddedNLUI

# No NLUI Server required
nlui = EmbeddedNLUI(
    llm_url="http://localhost:11434/v1",
    llm_model="qwen2.5:7b"
)

# Add OpenAPI directly
nlui.add_openapi(
    name="my-api",
    spec_url="https://api.company.com/openapi.json"
)

# Use
nlui.chat("Query user information")
```

**Advantages:**
- No NLUI Server deployment required
- Fully self-contained
- Ideal for rapid prototyping

**Limitations:**
- Requires rewriting the core engine in another language (complex)
- Or calling the Go engine via WASM/FFI (performance overhead)

---

## Recommendations

Based on different use cases:

### **Scenario 1: Production / Team Collaboration**
-> **Static Config + Dynamic API**
- Core targets in `nlui.yaml`
- Temporary/test targets added dynamically via API
- SDK: `client.add_target()`

### **Scenario 2: Go Application Integration**
-> **Embedded Mode**
- Configure everything directly in Go code
- No additional HTTP Server needed
- Best performance

### **Scenario 3: Rapid Prototyping / Local Development**
-> **Static Config File**
- Simple `nlui.yaml`
- Start NLUI Server
- SDK connects and uses

---

## Implementation Priority

### **Phase 1: Dynamic Targets API** (High Priority)

New API endpoints:
- `POST /api/targets` - Add target
- `GET /api/targets` - List targets
- `DELETE /api/targets/:name` - Remove target

New SDK methods:
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

### **Phase 2: File Upload Support**

Allow direct upload of OpenAPI spec files:
```python
client.add_target_from_file(
    name="my-api",
    spec_file="./openapi.yaml",
    base_url="https://api.company.com"
)
```

### **Phase 3: SDK Built-in Engine** (Low Priority)

Explore cross-language solutions:
- Option A: WASM version of the NLUI Engine
- Option B: gRPC service mode
- Option C: Independent implementation per language (high maintenance cost)

---

## Comparison Summary

| Feature | Static Config | Dynamic API | Go Embedded | SDK Built-in |
|---------|--------------|-------------|-------------|-------------|
| Runtime target addition | No | Yes | Yes | Yes |
| No restart needed | No | Yes | N/A | N/A |
| Cross-language support | Yes | Yes | No | Yes |
| Performance | High | High | Highest | Medium |
| Complexity | Low | Medium | Low | High |
| Maintenance cost | Low | Medium | Low | High |

---

## Available Solutions Now

**For Go users:**
Use embedded mode, fully supports dynamic configuration. See: `sdk/go/`

**For Python/JS users:**
Use `@nlui/engine` for a pure TypeScript engine with zero backend dependency.

**Alternative:**
Modify `nlui.yaml` and restart the NLUI Server.
