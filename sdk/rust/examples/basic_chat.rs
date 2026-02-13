use nlui::{ChatEvent, ChatOptions, NLUIClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== NLUI Rust SDK - Basic Chat Example ===\n");

    let client = NLUIClient::new("http://localhost:9000");

    // Simple chat
    println!("1. Simple chat:");
    let conv_id = client.chat(None, "Hello, NLUI!", None).await?;
    println!("   Conversation ID: {}\n", conv_id);

    // Chat with event handlers
    println!("2. Chat with streaming events:");
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
                        println!("\n   [Calling tool: {}]", name);
                    }
                }
                "tool_result" => {
                    println!("   [Tool completed]");
                }
                _ => {}
            }
        })),
        on_done: Some(Box::new(|conv_id: String| {
            println!("\n   Done! Conversation: {}", conv_id);
        })),
        on_error: Some(Box::new(|error: String| {
            eprintln!("   Error: {}", error);
        })),
    };

    client
        .chat(Some(&conv_id), "What can you help me with?", Some(options))
        .await?;

    println!("\n\n3. Retrieving conversation history:");
    let messages = client.get_conversation(&conv_id).await?;
    for (i, msg) in messages.iter().enumerate() {
        println!("   [{}] {}: {}", i, msg.role, msg.content);
    }

    Ok(())
}
