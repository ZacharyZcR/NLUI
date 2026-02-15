use nlui::{LLMConfig, NLUIClient, Target, ToolConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== NLUI Rust SDK - Complete Example ===\n");

    let client = NLUIClient::new("http://localhost:9000");

    // ==================== Phase 1: Targets ====================
    println!("Phase 1: Target Management");

    // Add a target
    println!("  Adding GitHub target...");
    let target = Target {
        name: "github".to_string(),
        base_url: "https://api.github.com".to_string(),
        spec: Some("https://api.github.com/openapi.json".to_string()),
        auth_type: Some("bearer".to_string()),
        token: Some("ghp_xxx".to_string()),
        description: Some("GitHub REST API".to_string()),
    };
    client.add_target(target).await?;

    // List targets
    let targets = client.list_targets().await?;
    println!("  Targets: {}", targets.len());

    // Probe a target
    println!("  Probing https://api.example.com...");
    let probe_result = client.probe_target("https://api.example.com").await?;
    println!(
        "  Probe result: found={}, tools={:?}",
        probe_result.found, probe_result.tools
    );

    println!();

    // ==================== Phase 2: Tools ====================
    println!("Phase 2: Tool Management");

    let tools = client.list_tools().await?;
    println!("  Available tools: {}", tools.len());
    for tool in tools.iter().take(3) {
        println!("    - {}: {}", tool.name, tool.description);
    }

    let sources = client.list_tool_sources().await?;
    println!("  Tool sources: {}", sources.len());
    for source in &sources {
        println!("    - {}: {} tools", source.name, source.tools.len());
    }

    println!();

    // ==================== Phase 3: Conversations & Messages ====================
    println!("Phase 3: Conversations & Message Editing");

    // Create conversation
    println!("  Creating conversation...");
    let conv = client.create_conversation(Some("Test Chat")).await?;
    println!("  Conversation ID: {}", conv.id);

    // Send a message
    println!("  Sending message...");
    client
        .chat(Some(&conv.id), "Hello, NLUI!", None)
        .await?;

    // Configure tools for this conversation
    println!("  Configuring tools...");
    let tool_config = ToolConfig {
        enabled_sources: Some(vec!["github".to_string()]),
        disabled_tools: Some(vec!["delete_repo".to_string()]),
    };
    client
        .update_conversation_tools(&conv.id, tool_config)
        .await?;

    // Get conversation messages
    let messages = client.get_conversation(&conv.id).await?;
    println!("  Messages: {}", messages.len());

    // Edit a message
    if messages.len() > 0 {
        println!("  Editing first message...");
        client
            .edit_message(&conv.id, 0, "Hello, updated message!", None)
            .await?;
    }

    // Regenerate from index
    if messages.len() > 1 {
        println!("  Regenerating from index 1...");
        client.regenerate_from(&conv.id, 1, None).await?;
    }

    // Delete a message
    if messages.len() > 2 {
        println!("  Deleting message at index 2...");
        client.delete_message(&conv.id, 2).await?;
    }

    // List all conversations
    let conversations = client.list_conversations().await?;
    println!("  Total conversations: {}", conversations.len());

    println!();

    // ==================== Phase 4: LLM Configuration ====================
    println!("Phase 4: LLM Configuration");

    // Get current config
    let current_config = client.get_llm_config().await?;
    println!("  Current model: {}", current_config.model);

    // Update config
    println!("  Updating LLM config...");
    let llm_config = LLMConfig {
        api_base: "https://api.openai.com/v1".to_string(),
        api_key: "sk-xxx".to_string(),
        model: "gpt-4".to_string(),
    };
    client.update_llm_config(llm_config).await?;

    // Probe local providers
    println!("  Probing local LLM providers...");
    let providers = client.probe_llm_providers().await?;
    println!("  Found {} local providers", providers.len());
    for provider in &providers {
        println!("    - {}: {}", provider.name, provider.api_base);
    }

    // Fetch models
    println!("  Fetching models from OpenAI...");
    match client
        .fetch_models("https://api.openai.com/v1", Some("sk-xxx"))
        .await
    {
        Ok(models) => {
            println!("  Available models: {}", models.len());
            for model in models.iter().take(5) {
                println!("    - {}", model);
            }
        }
        Err(e) => {
            println!("  (Expected error, invalid API key: {})", e);
        }
    }

    println!();

    // ==================== Phase 5: Proxy Configuration ====================
    println!("Phase 5: Proxy Configuration");

    // Get current proxy
    match client.get_proxy_config().await {
        Ok(config) => println!("  Current proxy: {}", config.url),
        Err(_) => println!("  No proxy configured"),
    }

    // Update proxy
    println!("  Updating proxy config...");
    client
        .update_proxy_config("http://127.0.0.1:7890")
        .await?;

    // Test proxy
    println!("  Testing proxy...");
    let test_result = client.test_proxy("http://127.0.0.1:7890").await?;
    println!(
        "  Proxy test: {}",
        if test_result.success {
            "SUCCESS"
        } else {
            "FAILED"
        }
    );
    if let Some(error) = test_result.error {
        println!("  Error: {}", error);
    }

    println!();

    // ==================== Cleanup ====================
    println!("Cleanup:");
    println!("  Deleting conversation...");
    client.delete_conversation(&conv.id).await?;

    println!("  Removing GitHub target...");
    client.remove_target("github").await?;

    println!("\n=== Example Complete ===");

    Ok(())
}
