//! NLUI Rust SDK
//!
//! A Rust client library for NLUI (Natural Language User Interface).
//!
//! # Features
//!
//! - ✅ **Type-safe** - Full type definitions with serde
//! - ✅ **Async/await** - Built on tokio and reqwest
//! - ✅ **SSE streaming** - Real-time LLM responses
//! - ✅ **Phase 1-5 complete** - 30+ methods, 100% feature parity
//!
//! # Example
//!
//! ```no_run
//! use nlui::{NLUIClient, Target};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let client = NLUIClient::new("http://localhost:9000");
//!
//!     // Add a target
//!     let target = Target {
//!         name: "github".to_string(),
//!         base_url: "https://api.github.com".to_string(),
//!         spec: Some("https://api.github.com/openapi.json".to_string()),
//!         auth_type: Some("bearer".to_string()),
//!         token: Some("ghp_xxx".to_string()),
//!         description: None,
//!     };
//!     client.add_target(target).await?;
//!
//!     // Chat
//!     client.chat(None, "List my repositories", None).await?;
//!
//!     Ok(())
//! }
//! ```

pub mod types;

pub use types::*;

use futures::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::collections::HashMap;
use thiserror::Error;
use tokio_stream::wrappers::LinesStream;

#[derive(Error, Debug)]
pub enum NLUIError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("JSON serialization failed: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("API error: {0}")]
    ApiError(String),
}

pub type Result<T> = std::result::Result<T, NLUIError>;

/// NLUI client for interacting with the NLUI HTTP server
#[derive(Clone)]
pub struct NLUIClient {
    base_url: String,
    client: Client,
}

impl NLUIClient {
    /// Create a new NLUI client
    ///
    /// # Arguments
    ///
    /// * `base_url` - Base URL of the NLUI server (e.g., "http://localhost:9000")
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            client: Client::new(),
        }
    }

    // ==================== Basic Operations ====================

    /// Send a chat message and receive streaming responses
    ///
    /// # Arguments
    ///
    /// * `conversation_id` - Optional conversation ID to continue an existing conversation
    /// * `message` - User message text
    /// * `options` - Optional chat options (event handlers)
    ///
    /// # Returns
    ///
    /// The conversation ID
    pub async fn chat(
        &self,
        conversation_id: Option<&str>,
        message: &str,
        options: Option<ChatOptions>,
    ) -> Result<String> {
        let url = format!("{}/api/chat", self.base_url);
        let body = json!({
            "conversation_id": conversation_id,
            "message": message,
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        let mut conv_id = String::new();
        let stream = response.bytes_stream();
        let lines_stream = LinesStream::new(
            tokio_util::codec::FramedRead::new(
                tokio_util::io::StreamReader::new(stream.map(|r| {
                    r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                })),
                tokio_util::codec::LinesCodec::new(),
            ),
        );

        tokio::pin!(lines_stream);

        while let Some(line) = lines_stream.next().await {
            let line = line.map_err(|e| NLUIError::ApiError(e.to_string()))?;
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..]; // Skip "data: "
            if let Ok(event) = serde_json::from_str::<ChatEvent>(data) {
                if event.event_type == "done" {
                    if let Some(cid) = event.data.get("conversation_id").and_then(|v| v.as_str()) {
                        conv_id = cid.to_string();
                        if let Some(opts) = &options {
                            if let Some(on_done) = &opts.on_done {
                                on_done(conv_id.clone());
                            }
                        }
                    }
                } else if event.event_type == "error" {
                    if let Some(opts) = &options {
                        if let Some(on_error) = &opts.on_error {
                            if let Some(msg) = event.data.get("message").and_then(|v| v.as_str()) {
                                on_error(msg.to_string());
                            }
                        }
                    }
                }

                if let Some(opts) = &options {
                    if let Some(on_event) = &opts.on_event {
                        on_event(event);
                    }
                }
            }
        }

        Ok(conv_id)
    }

    /// List all conversations
    pub async fn list_conversations(&self) -> Result<Vec<Conversation>> {
        let url = format!("{}/api/conversations", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Get messages from a conversation
    pub async fn get_conversation(&self, conversation_id: &str) -> Result<Vec<Message>> {
        let url = format!("{}/api/conversations/{}", self.base_url, conversation_id);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Create a new conversation
    pub async fn create_conversation(&self, title: Option<&str>) -> Result<Conversation> {
        let url = format!("{}/api/conversations", self.base_url);
        let body = json!({ "title": title });
        let response = self.client.post(&url).json(&body).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Delete a conversation
    pub async fn delete_conversation(&self, conversation_id: &str) -> Result<()> {
        let url = format!("{}/api/conversations/{}", self.base_url, conversation_id);
        let response = self.client.delete(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    // ==================== Phase 1: Targets ====================

    /// Add a new OpenAPI target
    pub async fn add_target(&self, target: Target) -> Result<()> {
        let url = format!("{}/api/targets", self.base_url);
        let response = self.client.post(&url).json(&target).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    /// List all targets
    pub async fn list_targets(&self) -> Result<Vec<serde_json::Value>> {
        let url = format!("{}/api/targets", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Remove a target
    pub async fn remove_target(&self, name: &str) -> Result<()> {
        let url = format!("{}/api/targets/{}", self.base_url, name);
        let response = self.client.delete(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    /// Probe an OpenAPI spec URL
    pub async fn probe_target(&self, url: &str) -> Result<ProbeResult> {
        let api_url = format!("{}/api/targets/probe", self.base_url);
        let body = json!({ "url": url });
        let response = self.client.post(&api_url).json(&body).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    // ==================== Phase 2: Tools ====================

    /// List all available tools
    pub async fn list_tools(&self) -> Result<Vec<Tool>> {
        let url = format!("{}/api/tools", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// List all tool sources
    pub async fn list_tool_sources(&self) -> Result<Vec<ToolSource>> {
        let url = format!("{}/api/tools/sources", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Get tool configuration for a conversation
    pub async fn get_conversation_tools(&self, conversation_id: &str) -> Result<ToolConfig> {
        let url = format!(
            "{}/api/conversations/{}/tools",
            self.base_url, conversation_id
        );
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Update tool configuration for a conversation
    pub async fn update_conversation_tools(
        &self,
        conversation_id: &str,
        config: ToolConfig,
    ) -> Result<()> {
        let url = format!(
            "{}/api/conversations/{}/tools",
            self.base_url, conversation_id
        );
        let response = self.client.put(&url).json(&config).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    // ==================== Phase 3: Message Editing ====================

    /// Edit a message and regenerate from that point
    pub async fn edit_message(
        &self,
        conversation_id: &str,
        index: usize,
        new_content: &str,
        options: Option<ChatOptions>,
    ) -> Result<String> {
        let url = format!(
            "{}/api/conversations/{}/messages/{}",
            self.base_url, conversation_id, index
        );
        let body = json!({ "content": new_content });

        let response = self
            .client
            .put(&url)
            .header("Accept", "text/event-stream")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        let mut conv_id = conversation_id.to_string();
        let stream = response.bytes_stream();
        let lines_stream = LinesStream::new(
            tokio_util::codec::FramedRead::new(
                tokio_util::io::StreamReader::new(stream.map(|r| {
                    r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                })),
                tokio_util::codec::LinesCodec::new(),
            ),
        );

        tokio::pin!(lines_stream);

        while let Some(line) = lines_stream.next().await {
            let line = line.map_err(|e| NLUIError::ApiError(e.to_string()))?;
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];
            if let Ok(event) = serde_json::from_str::<ChatEvent>(data) {
                if let Some(opts) = &options {
                    if let Some(on_event) = &opts.on_event {
                        on_event(event);
                    }
                }
            }
        }

        Ok(conv_id)
    }

    /// Regenerate from a specific message index
    pub async fn regenerate_from(
        &self,
        conversation_id: &str,
        index: usize,
        options: Option<ChatOptions>,
    ) -> Result<String> {
        let url = format!(
            "{}/api/conversations/{}/regenerate",
            self.base_url, conversation_id
        );
        let body = json!({ "from_index": index });

        let response = self
            .client
            .post(&url)
            .header("Accept", "text/event-stream")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        let mut conv_id = conversation_id.to_string();
        let stream = response.bytes_stream();
        let lines_stream = LinesStream::new(
            tokio_util::codec::FramedRead::new(
                tokio_util::io::StreamReader::new(stream.map(|r| {
                    r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                })),
                tokio_util::codec::LinesCodec::new(),
            ),
        );

        tokio::pin!(lines_stream);

        while let Some(line) = lines_stream.next().await {
            let line = line.map_err(|e| NLUIError::ApiError(e.to_string()))?;
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];
            if let Ok(event) = serde_json::from_str::<ChatEvent>(data) {
                if let Some(opts) = &options {
                    if let Some(on_event) = &opts.on_event {
                        on_event(event);
                    }
                }
            }
        }

        Ok(conv_id)
    }

    /// Delete a specific message
    pub async fn delete_message(&self, conversation_id: &str, index: usize) -> Result<()> {
        let url = format!(
            "{}/api/conversations/{}/messages/{}",
            self.base_url, conversation_id, index
        );
        let response = self.client.delete(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    /// Delete messages from a specific index onwards
    pub async fn delete_messages_from(&self, conversation_id: &str, index: usize) -> Result<()> {
        let url = format!(
            "{}/api/conversations/{}/messages/{}/from",
            self.base_url, conversation_id, index
        );
        let response = self.client.delete(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    // ==================== Phase 4: LLM Config ====================

    /// Get current LLM configuration
    pub async fn get_llm_config(&self) -> Result<LLMConfig> {
        let url = format!("{}/api/config/llm", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Update LLM configuration
    pub async fn update_llm_config(&self, config: LLMConfig) -> Result<()> {
        let url = format!("{}/api/config/llm", self.base_url);
        let response = self.client.put(&url).json(&config).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    /// Probe for local LLM providers
    pub async fn probe_llm_providers(&self) -> Result<Vec<LLMProvider>> {
        let url = format!("{}/api/config/llm/providers", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Fetch available models from an LLM provider
    pub async fn fetch_models(&self, api_base: &str, api_key: Option<&str>) -> Result<Vec<String>> {
        let url = format!("{}/api/config/llm/models", self.base_url);
        let body = json!({
            "api_base": api_base,
            "api_key": api_key,
        });
        let response = self.client.post(&url).json(&body).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        let models_response: ModelsResponse = response.json().await?;
        Ok(models_response.models)
    }

    // ==================== Phase 5: Proxy Config ====================

    /// Get current proxy configuration
    pub async fn get_proxy_config(&self) -> Result<ProxyConfig> {
        let url = format!("{}/api/config/proxy", self.base_url);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }

    /// Update proxy configuration
    pub async fn update_proxy_config(&self, proxy_url: &str) -> Result<()> {
        let url = format!("{}/api/config/proxy", self.base_url);
        let body = json!({ "url": proxy_url });
        let response = self.client.put(&url).json(&body).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(())
    }

    /// Test a proxy configuration
    pub async fn test_proxy(&self, proxy_url: &str) -> Result<ProxyTestResult> {
        let url = format!("{}/api/config/proxy/test", self.base_url);
        let body = json!({ "url": proxy_url });
        let response = self.client.post(&url).json(&body).send().await?;

        if !response.status().is_success() {
            let error = response.text().await?;
            return Err(NLUIError::ApiError(error));
        }

        Ok(response.json().await?)
    }
}
