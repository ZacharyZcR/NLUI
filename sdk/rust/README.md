# NLUI Rust SDK

Rust client library for NLUI (Natural Language User Interface) - Type-safe, async, zero-cost abstractions.

## ✨ Features

- ✅ **Type-safe** - Full type definitions with serde
- ✅ **Async/await** - Built on tokio and reqwest
- ✅ **Zero-cost** - No runtime overhead, compile-time guarantees
- ✅ **SSE streaming** - Real-time LLM responses
- ✅ **Phase 1-5 complete** - 30+ methods, 100% feature parity
- ✅ **Error handling** - Custom error types with thiserror

## 📦 Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
nlui = "1.0"
tokio = { version = "1", features = ["full"] }
```

## 🚀 Quick Start

### Basic Chat

```rust
use nlui::NLUIClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NLUIClient::new("http://localhost:9000");

    let conv_id = client.chat(None, "Hello, NLUI!", None).await?;
    println!("Conversation ID: {}", conv_id);

    Ok(())
}
```

### Chat with Event Handlers

```rust
use nlui::{NLUIClient, ChatOptions, ChatEvent};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NLUIClient::new("http://localhost:9000");

    let options = ChatOptions {
        on_event: Some(Box::new(|event: ChatEvent| {
            match event.event_type.as_str() {
                "content_delta" => {
                    if let Some(delta) = event.data.get("delta").and_then(|v| v.as_str()) {
                        print!("{}", delta);
                    }
                }
                "tool_call" => {
                    if let Some(name) = event.data.get("name").and_then(|v| v.as_str()) {
                        println!("\n[Tool: {}]", name);
                    }
                }
                _ => {}
            }
        })),
        on_done: Some(Box::new(|conv_id: String| {
            println!("\nConversation: {}", conv_id);
        })),
        on_error: Some(Box::new(|error: String| {
            eprintln!("Error: {}", error);
        })),
    };

    client.chat(None, "What can you do?", Some(options)).await?;

    Ok(())
}
```

### Complete Example

```rust
use nlui::{NLUIClient, Target, LLMConfig, ToolConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NLUIClient::new("http://localhost:9000");

    // Phase 1: Add Target
    let target = Target {
        name: "github".to_string(),
        base_url: "https://api.github.com".to_string(),
        spec: Some("https://api.github.com/openapi.json".to_string()),
        auth_type: Some("bearer".to_string()),
        token: Some("ghp_xxx".to_string()),
        description: None,
    };
    client.add_target(target).await?;

    // List all targets
    let targets = client.list_targets().await?;
    println!("Targets: {:?}", targets);

    // Probe a target
    let probe_result = client.probe_target("https://api.example.com").await?;
    println!("Probe: {:?}", probe_result);

    // Phase 2: Tools Management
    let tools = client.list_tools().await?;
    println!("Available tools: {}", tools.len());

    let sources = client.list_tool_sources().await?;
    for source in &sources {
        println!("Source {}: {} tools", source.name, source.tools.len());
    }

    // Configure conversation tools
    let conv_id = client.chat(None, "Hello", None).await?;
    let tool_config = ToolConfig {
        enabled_sources: Some(vec!["github".to_string()]),
        disabled_tools: None,
    };
    client.update_conversation_tools(&conv_id, tool_config).await?;

    // Phase 3: Message Editing
    let messages = client.get_conversation(&conv_id).await?;
    println!("Messages: {}", messages.len());

    // Edit a message
    if messages.len() > 0 {
        client.edit_message(&conv_id, 0, "New message", None).await?;
    }

    // Regenerate from index
    client.regenerate_from(&conv_id, 1, None).await?;

    // Delete a message
    client.delete_message(&conv_id, 2).await?;

    // Phase 4: LLM Configuration
    let llm_config = LLMConfig {
        api_base: "https://api.openai.com/v1".to_string(),
        api_key: "sk-xxx".to_string(),
        model: "gpt-4".to_string(),
    };
    client.update_llm_config(llm_config).await?;

    // Probe local providers
    let providers = client.probe_llm_providers().await?;
    for provider in &providers {
        println!("Provider: {} at {}", provider.name, provider.api_base);
    }

    // Fetch models
    let models = client.fetch_models("https://api.openai.com/v1", Some("sk-xxx")).await?;
    println!("Available models: {:?}", models);

    // Phase 5: Proxy Configuration
    client.update_proxy_config("http://127.0.0.1:7890").await?;

    let proxy_test = client.test_proxy("http://127.0.0.1:7890").await?;
    println!("Proxy test: {:?}", proxy_test);

    Ok(())
}
```

## 📚 API Documentation

### NLUIClient

Create a client instance:

```rust
let client = NLUIClient::new("http://localhost:9000");
```

---

### Chat & Conversations

#### `chat(conversation_id, message, options) -> Result<String>`

Send a chat message and receive streaming responses.

```rust
let conv_id = client.chat(None, "Hello!", None).await?;
```

#### `list_conversations() -> Result<Vec<Conversation>>`

List all conversations.

```rust
let conversations = client.list_conversations().await?;
```

#### `get_conversation(id) -> Result<Vec<Message>>`

Get messages from a conversation.

```rust
let messages = client.get_conversation("conv-123").await?;
```

#### `create_conversation(title) -> Result<Conversation>`

Create a new conversation.

```rust
let conv = client.create_conversation(Some("My Chat")).await?;
```

#### `delete_conversation(id) -> Result<()>`

Delete a conversation.

```rust
client.delete_conversation("conv-123").await?;
```

---

### Phase 1: Targets

#### `add_target(target) -> Result<()>`

Add a new OpenAPI target.

```rust
let target = Target {
    name: "github".to_string(),
    base_url: "https://api.github.com".to_string(),
    spec: Some("https://api.github.com/openapi.json".to_string()),
    auth_type: Some("bearer".to_string()),
    token: Some("ghp_xxx".to_string()),
    description: None,
};
client.add_target(target).await?;
```

#### `list_targets() -> Result<Vec<Value>>`

List all targets.

```rust
let targets = client.list_targets().await?;
```

#### `remove_target(name) -> Result<()>`

Remove a target.

```rust
client.remove_target("github").await?;
```

#### `probe_target(url) -> Result<ProbeResult>`

Probe an OpenAPI spec URL.

```rust
let result = client.probe_target("https://api.example.com").await?;
println!("Found: {}, Tools: {:?}", result.found, result.tools);
```

---

### Phase 2: Tools

#### `list_tools() -> Result<Vec<Tool>>`

List all available tools.

```rust
let tools = client.list_tools().await?;
```

#### `list_tool_sources() -> Result<Vec<ToolSource>>`

List all tool sources.

```rust
let sources = client.list_tool_sources().await?;
```

#### `get_conversation_tools(id) -> Result<ToolConfig>`

Get tool configuration for a conversation.

```rust
let config = client.get_conversation_tools("conv-123").await?;
```

#### `update_conversation_tools(id, config) -> Result<()>`

Update tool configuration for a conversation.

```rust
let config = ToolConfig {
    enabled_sources: Some(vec!["github".to_string()]),
    disabled_tools: Some(vec!["delete_repo".to_string()]),
};
client.update_conversation_tools("conv-123", config).await?;
```

---

### Phase 3: Message Editing

#### `edit_message(id, index, content, options) -> Result<String>`

Edit a message and regenerate from that point.

```rust
client.edit_message("conv-123", 2, "New message", None).await?;
```

#### `regenerate_from(id, index, options) -> Result<String>`

Regenerate from a specific message index.

```rust
client.regenerate_from("conv-123", 3, None).await?;
```

#### `delete_message(id, index) -> Result<()>`

Delete a specific message.

```rust
client.delete_message("conv-123", 5).await?;
```

#### `delete_messages_from(id, index) -> Result<()>`

Delete messages from a specific index onwards.

```rust
client.delete_messages_from("conv-123", 5).await?;
```

---

### Phase 4: LLM Configuration

#### `get_llm_config() -> Result<LLMConfig>`

Get current LLM configuration.

```rust
let config = client.get_llm_config().await?;
```

#### `update_llm_config(config) -> Result<()>`

Update LLM configuration.

```rust
let config = LLMConfig {
    api_base: "https://api.openai.com/v1".to_string(),
    api_key: "sk-xxx".to_string(),
    model: "gpt-4".to_string(),
};
client.update_llm_config(config).await?;
```

#### `probe_llm_providers() -> Result<Vec<LLMProvider>>`

Probe for local LLM providers.

```rust
let providers = client.probe_llm_providers().await?;
```

#### `fetch_models(api_base, api_key) -> Result<Vec<String>>`

Fetch available models from an LLM provider.

```rust
let models = client.fetch_models("https://api.openai.com/v1", Some("sk-xxx")).await?;
```

---

### Phase 5: Proxy Configuration

#### `get_proxy_config() -> Result<ProxyConfig>`

Get current proxy configuration.

```rust
let config = client.get_proxy_config().await?;
```

#### `update_proxy_config(url) -> Result<()>`

Update proxy configuration.

```rust
client.update_proxy_config("http://127.0.0.1:7890").await?;
```

#### `test_proxy(url) -> Result<ProxyTestResult>`

Test a proxy configuration.

```rust
let result = client.test_proxy("http://127.0.0.1:7890").await?;
println!("Success: {}", result.success);
```

---

## 🏗️ Type Definitions

All types are fully documented and implement `Serialize`, `Deserialize`, `Clone`, and `Debug`.

```rust
pub struct Target {
    pub name: String,
    pub base_url: String,
    pub spec: Option<String>,
    pub auth_type: Option<String>,
    pub token: Option<String>,
    pub description: Option<String>,
}

pub struct LLMConfig {
    pub api_base: String,
    pub api_key: String,
    pub model: String,
}

pub struct ChatOptions {
    pub on_event: Option<Box<dyn Fn(ChatEvent) + Send + Sync>>,
    pub on_done: Option<Box<dyn Fn(String) + Send + Sync>>,
    pub on_error: Option<Box<dyn Fn(String) + Send + Sync>>,
}

// ... and more
```

See [src/types.rs](src/types.rs) for the complete list.

---

## 🎯 Error Handling

The SDK uses a custom `Result<T>` type with `NLUIError`:

```rust
use nlui::Result;

async fn example() -> Result<()> {
    let client = NLUIClient::new("http://localhost:9000");
    client.list_tools().await?;
    Ok(())
}
```

Errors include:
- `RequestFailed` - HTTP request errors
- `JsonError` - JSON serialization errors
- `ApiError` - API-level errors

---

## 🧪 Examples

See the [examples](examples/) directory for complete working examples:

```bash
cargo run --example basic_chat
cargo run --example complete_example
```

---

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests at:

https://github.com/ZacharyZcR/NLUI

---

## 📝 License

MIT License
