use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// SSE event from chat stream
#[derive(Debug, Clone, Deserialize)]
pub struct ChatEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: serde_json::Value,
}

/// Message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_args: Option<String>,
}

/// Conversation metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// OpenAPI target configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Target {
    pub name: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec: Option<String>,
    #[serde(rename = "authType", skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    #[serde(rename = "targetName")]
    pub target_name: String,
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
}

/// Tool source metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSource {
    pub name: String,
    pub tools: Vec<ToolInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    pub name: String,
    #[serde(rename = "display_name")]
    pub display_name: String,
    pub description: String,
}

/// Tool configuration for a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled_sources: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_tools: Option<Vec<String>>,
}

/// LLM configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMConfig {
    pub api_base: String,
    pub api_key: String,
    pub model: String,
}

/// Proxy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub url: String,
}

/// LLM provider metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMProvider {
    pub name: String,
    pub api_base: String,
}

/// Target probe result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResult {
    pub found: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<usize>,
}

/// Proxy test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyTestResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Model list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub models: Vec<String>,
}

/// Chat options
#[derive(Debug, Clone, Default)]
pub struct ChatOptions {
    pub on_event: Option<Box<dyn Fn(ChatEvent) + Send + Sync>>,
    pub on_done: Option<Box<dyn Fn(String) + Send + Sync>>,
    pub on_error: Option<Box<dyn Fn(String) + Send + Sync>>,
}
