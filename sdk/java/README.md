# NLUI Java SDK

Java SDK for NLUI (Natural Language User Interface) - 企业级 Java 应用接入方案。

## ✨ 特性

- ✅ **完整的 Phase 1-5 功能** - 30+ 方法，100% 功能对等
- ✅ **Java 11+ 标准库** - 使用 HttpClient，无重依赖
- ✅ **SSE 流式支持** - 实时接收 LLM 响应
- ✅ **类型安全** - 完整的模型类定义
- ✅ **线程安全** - 支持并发调用
- ✅ **Spring Boot 友好** - 易于集成到 Spring 应用

## 📦 安装

### Maven

```xml
<dependency>
    <groupId>com.nlui</groupId>
    <artifactId>nlui-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```gradle
implementation 'com.nlui:nlui-java-sdk:1.0.0'
```

### 手动编译

```bash
cd sdk/java
mvn clean install
```

## 🚀 快速开始

### 基础聊天

```java
import com.nlui.client.NLUIClient;
import com.nlui.client.models.ChatEvent;

public class Example {
    public static void main(String[] args) {
        NLUIClient client = new NLUIClient("http://localhost:9000");

        // 发送消息（流式响应）
        client.chat("你好，介绍一下自己",
            event -> {
                // 处理流式事件
                if ("content_delta".equals(event.getType())) {
                    System.out.print(event.getData().get("delta"));
                }
            },
            conversationId -> {
                // 对话完成
                System.out.println("\nConversation ID: " + conversationId);
            },
            error -> {
                // 错误处理
                System.err.println("Error: " + error);
            }
        );
    }
}
```

### 完整示例

```java
import com.nlui.client.NLUIClient;
import com.nlui.client.models.*;
import java.util.*;

public class FullExample {
    public static void main(String[] args) throws Exception {
        NLUIClient client = new NLUIClient("http://localhost:9000");

        // Phase 1: 添加 OpenAPI Target
        Target github = new Target();
        github.setName("github");
        github.setBaseUrl("https://api.github.com");
        github.setSpec("https://api.github.com/openapi.json");
        github.setAuthType("bearer");
        github.setToken("ghp_xxx");
        client.addTarget(github);

        // 列出所有 targets
        List<Map<String, Object>> targets = client.listTargets();
        System.out.println("Targets: " + targets);

        // Phase 2: 工具管理
        List<Tool> tools = client.listTools();
        System.out.println("Available tools: " + tools.size());

        // Phase 3: 发送消息
        String convId = client.chat("列出我的 GitHub 仓库",
            event -> {
                if ("content_delta".equals(event.getType())) {
                    System.out.print(event.getData().get("delta"));
                }
            },
            cid -> System.out.println("\nDone: " + cid),
            err -> System.err.println("Error: " + err)
        );

        // Phase 4: 编辑消息并重新生成
        client.editMessage(convId, 0, "列出我的前 5 个仓库",
            event -> {
                if ("content_delta".equals(event.getType())) {
                    System.out.print(event.getData().get("delta"));
                }
            }
        );

        // Phase 5: 配置 LLM
        LLMConfig config = new LLMConfig(
            "https://api.openai.com/v1",
            "sk-xxx",
            "gpt-4"
        );
        client.updateLLMConfig(config);

        // 探测本地 LLM 提供商
        List<Map<String, Object>> providers = client.probeLLMProviders();
        System.out.println("Local providers: " + providers);

        // Phase 6: 代理配置
        client.updateProxyConfig("http://127.0.0.1:7890");
        Map<String, Object> proxyTest = client.testProxy("http://127.0.0.1:7890");
        System.out.println("Proxy test: " + proxyTest);

        // 对话管理
        List<Conversation> conversations = client.listConversations();
        System.out.println("Total conversations: " + conversations.size());
    }
}
```

## 📚 API 文档

### 核心聊天 API

#### `chat(String message, Consumer<ChatEvent> onEvent, Consumer<String> onDone, Consumer<String> onError)`

发送消息并接收流式响应。

**参数：**
- `message` - 用户消息
- `onEvent` - 事件处理器（接收 SSE 事件）
- `onDone` - 完成回调（接收 conversation ID）
- `onError` - 错误处理器

**返回：** `String` - Conversation ID

**示例：**
```java
client.chat("你好",
    event -> {
        switch (event.getType()) {
            case "content_delta":
                System.out.print(event.getData().get("delta"));
                break;
            case "tool_call":
                System.out.println("\nTool: " + event.getData().get("name"));
                break;
        }
    },
    convId -> System.out.println("\nDone: " + convId),
    error -> System.err.println("Error: " + error)
);
```

---

### Phase 1: Target 管理

#### `addTarget(Target target)`

添加新的 OpenAPI target。

```java
Target target = new Target();
target.setName("my-api");
target.setBaseUrl("https://api.example.com");
target.setSpec("https://api.example.com/openapi.json");
target.setAuthType("bearer");
target.setToken("xxx");
client.addTarget(target);
```

#### `listTargets()`

列出所有 targets。

```java
List<Map<String, Object>> targets = client.listTargets();
```

#### `removeTarget(String name)`

删除指定 target。

```java
client.removeTarget("my-api");
```

#### `probeTarget(String url)`

探测 OpenAPI 规范。

```java
Map<String, Object> result = client.probeTarget("https://api.example.com");
System.out.println("Found: " + result.get("found"));
```

---

### Phase 2: 工具管理

#### `listTools()`

列出所有可用工具。

```java
List<Tool> tools = client.listTools();
for (Tool tool : tools) {
    System.out.println(tool.getName() + ": " + tool.getDescription());
}
```

#### `listToolSources()`

列出所有工具源。

```java
List<Map<String, Object>> sources = client.listToolSources();
```

#### `updateConversationTools(String conversationId, List<String> enabledSources, List<String> disabledTools)`

更新对话的工具配置。

```java
client.updateConversationTools(
    convId,
    Arrays.asList("github"),  // 只启用 github
    Arrays.asList("delete_repo")  // 禁用危险工具
);
```

---

### Phase 3: 消息编辑

#### `editMessage(String conversationId, int messageIndex, String newContent, Consumer<ChatEvent> onEvent)`

编辑消息并重新生成。

```java
client.editMessage(convId, 2, "新的问题", event -> {
    if ("content_delta".equals(event.getType())) {
        System.out.print(event.getData().get("delta"));
    }
});
```

#### `regenerateFrom(String conversationId, int fromIndex, Consumer<ChatEvent> onEvent)`

从指定位置重新生成。

```java
client.regenerateFrom(convId, 3, event -> {
    // 处理事件
});
```

#### `deleteMessage(String conversationId, int messageIndex)`

删除单条消息。

```java
client.deleteMessage(convId, 5);
```

#### `deleteMessagesFrom(String conversationId, int fromIndex)`

批量删除消息（从指定索引开始）。

```java
client.deleteMessagesFrom(convId, 3);
```

---

### Phase 4: LLM 配置

#### `getLLMConfig()`

获取当前 LLM 配置。

```java
LLMConfig config = client.getLLMConfig();
System.out.println("Model: " + config.getModel());
```

#### `updateLLMConfig(LLMConfig config)`

更新 LLM 配置。

```java
LLMConfig config = new LLMConfig(
    "https://api.openai.com/v1",
    "sk-xxx",
    "gpt-4"
);
client.updateLLMConfig(config);
```

#### `probeLLMProviders()`

探测本地 LLM 服务。

```java
List<Map<String, Object>> providers = client.probeLLMProviders();
```

#### `fetchModels(String apiBase, String apiKey)`

获取可用模型列表。

```java
List<String> models = client.fetchModels("https://api.openai.com/v1", "sk-xxx");
```

---

### Phase 5: 代理配置

#### `getProxyConfig()`

获取代理配置。

```java
Map<String, String> proxy = client.getProxyConfig();
```

#### `updateProxyConfig(String proxyURL)`

更新代理配置。

```java
client.updateProxyConfig("http://127.0.0.1:7890");
```

#### `testProxy(String proxyURL)`

测试代理连接。

```java
Map<String, Object> result = client.testProxy("http://127.0.0.1:7890");
System.out.println("Success: " + result.get("success"));
```

---

### 对话管理

#### `listConversations()`

列出所有对话。

```java
List<Conversation> conversations = client.listConversations();
```

#### `getConversation(String id)`

获取对话详情。

```java
Conversation conv = client.getConversation(convId);
System.out.println("Title: " + conv.getTitle());
```

#### `deleteConversation(String id)`

删除对话。

```java
client.deleteConversation(convId);
```

---

## 🏗️ Spring Boot 集成

### 配置 Bean

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.nlui.client.NLUIClient;

@Configuration
public class NLUIConfig {
    @Bean
    public NLUIClient nluiClient() {
        return new NLUIClient("http://localhost:9000");
    }
}
```

### 使用示例

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.nlui.client.NLUIClient;

@Service
public class ChatService {
    @Autowired
    private NLUIClient nluiClient;

    public String chat(String message) {
        return nluiClient.chat(message,
            event -> {
                // 处理事件（可以通过 WebSocket 推送给前端）
            },
            convId -> {
                // 对话完成
            },
            error -> {
                // 错误处理
            }
        );
    }
}
```

---

## 🎯 事件类型

SSE 事件类型（`ChatEvent.getType()`）：

| 事件类型 | 说明 | 数据字段 |
|---------|------|---------|
| `content_delta` | 流式文本增量 | `delta` (String) |
| `content` | 完整文本块 | `text` (String) |
| `tool_call` | 工具调用 | `name`, `arguments` |
| `tool_result` | 工具执行结果 | `name`, `result` |
| `usage` | Token 使用统计 | `total_tokens`, `prompt_tokens`, `completion_tokens` |
| `error` | 错误事件 | `error` (String) |
| `done` | 对话完成 | `conversation_id` |

---

## 🔧 高级用法

### 自定义 HttpClient

```java
import java.net.http.HttpClient;
import java.time.Duration;

HttpClient customClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(30))
    .followRedirects(HttpClient.Redirect.NORMAL)
    .build();

// 注意：当前版本不支持自定义 HttpClient，将在后续版本添加
```

### 异步调用

```java
import java.util.concurrent.CompletableFuture;

CompletableFuture.runAsync(() -> {
    try {
        client.chat("异步消息", event -> {
            // 处理事件
        }, null, null);
    } catch (Exception e) {
        e.printStackTrace();
    }
});
```

---

## 📝 License

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

仓库地址：https://github.com/ZacharyZcR/NLUI
