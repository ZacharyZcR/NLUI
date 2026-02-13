# NLUI Go SDK

完整的 Go SDK，支持所有 NLUI HTTP API 功能。

## 安装

```bash
go get github.com/ZacharyZcR/NLUI/sdk/go/nluisdk
```

## 快速开始

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")

	// 发送聊天消息
	err := client.Chat(context.Background(), "你好", nluisdk.ChatOptions{
		OnEvent: func(event nluisdk.ChatEvent) {
			fmt.Printf("Event: %s\n", event.Type)
		},
		OnDone: func(conversationID string) {
			fmt.Printf("Done: %s\n", conversationID)
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
```

## Phase 1: Targets 动态管理

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 动态添加 OpenAPI target
	result, err := client.AddTarget(ctx, nluisdk.Target{
		Name:        "github",
		BaseURL:     "https://api.github.com",
		Spec:        "https://api.github.com/openapi.json",
		AuthType:    "bearer",
		Description: "GitHub API",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Added target with %d tools\n", result.ToolCount)

	// 列出所有 targets
	targets, err := client.ListTargets(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, t := range targets {
		fmt.Printf("%s: %s (%d tools)\n", t.Name, t.BaseURL, t.ToolCount)
	}

	// 删除 target
	_, err = client.RemoveTarget(ctx, "github")
	if err != nil {
		log.Fatal(err)
	}

	// 探测 OpenAPI spec
	probe, err := client.ProbeTarget(ctx, "https://api.example.com")
	if err != nil {
		log.Fatal(err)
	}
	if probe.Found {
		fmt.Printf("Found spec at: %s\n", probe.SpecURL)
		fmt.Printf("Tool count: %d\n", probe.ToolCount)
	}
}
```

## Phase 2: 工具管理

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 列出所有可用工具
	tools, err := client.ListTools(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, tool := range tools {
		fmt.Printf("%s (%s): %s\n", tool.Name, tool.Source, tool.Description)
	}

	// 列出工具源
	sources, err := client.ListToolSources(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, source := range sources {
		fmt.Printf("%s [%s]: %d tools\n", source.Name, source.Type, source.ToolCount)
	}

	// 更新对话工具配置
	_, err = client.UpdateConversationTools(ctx, conversationID, nluisdk.ToolConfig{
		EnabledSources: []string{"github", "gitlab"},
		DisabledTools:  []string{"delete_repo"},
	})
	if err != nil {
		log.Fatal(err)
	}

	// 获取对话工具配置
	toolConfig, err := client.GetConversationTools(ctx, conversationID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Enabled sources: %v\n", toolConfig.EnabledSources)
	fmt.Printf("Disabled tools: %v\n", toolConfig.DisabledTools)
}
```

## Phase 3: 消息编辑与重新生成

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 编辑消息并重新生成
	err := client.EditMessage(ctx, conversationID, 2, "新的问题", nluisdk.EditMessageOptions{
		OnEvent: func(event nluisdk.ChatEvent) {
			fmt.Printf("Event: %s\n", event.Type)
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	// 从某个索引开始重新生成
	err = client.RegenerateFrom(ctx, conversationID, 3, nluisdk.RegenerateFromOptions{
		OnEvent: func(event nluisdk.ChatEvent) {
			fmt.Printf("Event: %s\n", event.Type)
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	// 删除单条消息
	_, err = client.DeleteMessage(ctx, conversationID, 5)
	if err != nil {
		log.Fatal(err)
	}

	// 删除从某个索引开始的所有消息
	_, err = client.DeleteMessagesFrom(ctx, conversationID, 3)
	if err != nil {
		log.Fatal(err)
	}
}
```

## Phase 4: LLM 配置管理

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 获取当前 LLM 配置
	llmConfig, err := client.GetLLMConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Current LLM: %s\n", llmConfig.Model)

	// 更新 LLM 配置
	_, err = client.UpdateLLMConfig(ctx, nluisdk.LLMConfig{
		APIBase: "https://api.openai.com/v1",
		APIKey:  "sk-xxx",
		Model:   "gpt-4",
	})
	if err != nil {
		log.Fatal(err)
	}

	// 探测可用的 LLM 提供商
	providers, err := client.ProbeLLMProviders(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, provider := range providers {
		fmt.Printf("%s: %s\n", provider.Name, provider.URL)
	}

	// 获取模型列表
	models, err := client.FetchModels(ctx, "https://api.openai.com/v1", "sk-xxx")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Available models: %v\n", models)
}
```

## Phase 5: 代理配置

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 获取代理配置
	proxyConfig, err := client.GetProxyConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Current proxy: %s\n", proxyConfig.Proxy)

	// 更新代理配置
	_, err = client.UpdateProxyConfig(ctx, "http://127.0.0.1:7890")
	if err != nil {
		log.Fatal(err)
	}

	// 测试代理连接
	testResult, err := client.TestProxy(ctx, "http://127.0.0.1:7890")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Proxy test: %s\n", testResult.Message)
}
```

## 完整示例：动态 API 集成

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	// 1. 探测并添加 API
	probe, err := client.ProbeTarget(ctx, "https://api.github.com")
	if err != nil {
		log.Fatal(err)
	}

	if probe.Found {
		_, err := client.AddTarget(ctx, nluisdk.Target{
			Name:     "github",
			BaseURL:  "https://api.github.com",
			Spec:     probe.SpecURL,
			AuthType: "bearer",
		})
		if err != nil {
			log.Fatal(err)
		}
	}

	// 2. 配置 LLM
	_, err = client.UpdateLLMConfig(ctx, nluisdk.LLMConfig{
		APIBase: "https://api.openai.com/v1",
		APIKey:  os.Getenv("OPENAI_API_KEY"),
		Model:   "gpt-4",
	})
	if err != nil {
		log.Fatal(err)
	}

	// 3. 创建对话并限制工具
	conv, err := client.CreateConversation(ctx, "GitHub 集成测试")
	if err != nil {
		log.Fatal(err)
	}

	_, err = client.UpdateConversationTools(ctx, conv.ID, nluisdk.ToolConfig{
		EnabledSources: []string{"github"},
	})
	if err != nil {
		log.Fatal(err)
	}

	// 4. 开始对话
	err = client.Chat(ctx, "列出我的所有仓库", nluisdk.ChatOptions{
		ConversationID: conv.ID,
		OnEvent: func(event nluisdk.ChatEvent) {
			fmt.Printf("[%s] %s\n", event.Type, string(event.Data))
		},
		OnDone: func(conversationID string) {
			fmt.Printf("Conversation completed: %s\n", conversationID)
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
```

## 自定义 HTTP 客户端

```go
package main

import (
	"net/http"
	"time"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	// 创建自定义 HTTP 客户端
	customClient := &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:       10,
			IdleConnTimeout:    30 * time.Second,
			DisableCompression: true,
		},
	}

	client := nluisdk.NewClient("http://localhost:9000").
		WithHTTPClient(customClient).
		WithAPIKey("your-api-key")
}
```

## 错误处理

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")
	ctx := context.Background()

	conv, err := client.GetConversation(ctx, "non-existent-id")
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			log.Fatal("Request timeout")
		}
		log.Fatalf("Failed to get conversation: %v", err)
	}

	fmt.Printf("Conversation: %s\n", conv.Title)
}
```

## Context 支持

所有方法都支持 `context.Context`，可用于超时控制和取消操作：

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/ZacharyZcR/NLUI/sdk/go/nluisdk"
)

func main() {
	client := nluisdk.NewClient("http://localhost:9000")

	// 设置 5 秒超时
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := client.Chat(ctx, "你好", nluisdk.ChatOptions{
		OnEvent: func(event nluisdk.ChatEvent) {
			// Handle events
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
```

## 功能对等性

Go SDK 与桌面端完全对等，支持所有 30 个功能：

- ✅ Phase 1: Targets 动态管理（4 个方法）
- ✅ Phase 2: 工具管理（4 个方法）
- ✅ Phase 3: 消息编辑与重新生成（4 个方法）
- ✅ Phase 4: LLM 配置管理（4 个方法）
- ✅ Phase 5: 代理配置（3 个方法）
- ✅ 基础功能（7 个方法）

**总计：26 个公共方法，100% 功能对等**

## 类型安全

Go SDK 提供完整的类型定义，所有 API 响应都有对应的结构体：

- `Target` - OpenAPI target 配置
- `Tool` - 工具定义
- `ToolSource` - 工具源信息
- `ToolConfig` - 对话工具配置
- `LLMConfig` - LLM 配置
- `LLMProvider` - LLM 提供商信息
- `ProxyConfig` - 代理配置
- `ChatEvent` - 聊天事件
- `Conversation` - 对话
- `Message` - 消息
