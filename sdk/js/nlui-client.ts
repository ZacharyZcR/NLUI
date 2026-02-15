/**
 * NLUI JavaScript/TypeScript SDK
 *
 * 用于浏览器和 Node.js 的完整客户端 SDK
 */

export interface NLUIConfig {
  baseURL: string;
  apiKey?: string;
  onError?: (error: Error) => void;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: any[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatOptions {
  conversationId?: string;
  onEvent?: (event: ChatEvent) => void;
  onDone?: (conversationId: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export type ChatEventType =
  | "content_delta"
  | "content"
  | "tool_call"
  | "tool_result"
  | "usage"
  | "error"
  | "done";

export interface ChatEvent {
  type: ChatEventType;
  data: any;
}

// ============= Phase 1-5 Types =============

export interface Target {
  name: string;
  base_url: string;
  spec?: string;
  auth_type?: string;
  description?: string;
  tool_count?: number;
}

export interface Tool {
  name: string;
  source: string;
  description: string;
}

export interface ToolSource {
  name: string;
  type: "openapi" | "mcp";
  tool_count: number;
}

export interface LLMConfig {
  api_base: string;
  api_key: string;
  model: string;
}

export interface LLMProvider {
  name: string;
  url: string;
}

export interface ProxyConfig {
  proxy: string;
}

export class NLUIClient {
  private baseURL: string;
  private apiKey?: string;
  private onError?: (error: Error) => void;

  constructor(config: NLUIConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.onError = config.onError;
  }

  /**
   * 健康检查
   */
  async health(): Promise<{ status: string; tools: number }> {
    const response = await fetch(`${this.baseURL}/api/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 获取服务信息
   */
  async info(): Promise<{ language: string; tools: number }> {
    const response = await fetch(`${this.baseURL}/api/info`);
    if (!response.ok) throw new Error(`Info failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 发送聊天消息（SSE 流式）
   */
  async chat(message: string, options: ChatOptions = {}): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        conversation_id: options.conversationId || "",
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = new Error(`Chat failed: ${response.statusText}`);
      if (options.onError) {
        options.onError(error);
      } else if (this.onError) {
        this.onError(error);
      }
      throw error;
    }

    // 解析 SSE 流
    await this.handleSSEStream(response, options);
  }

  /**
   * 列出所有对话
   */
  async listConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.baseURL}/api/conversations`);
    if (!response.ok) throw new Error(`List conversations failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 创建新对话
   */
  async createConversation(title: string): Promise<Conversation> {
    const response = await fetch(`${this.baseURL}/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error(`Create conversation failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 获取对话详情
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await fetch(`${this.baseURL}/api/conversations/${id}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error("Conversation not found");
      throw new Error(`Get conversation failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 删除对话
   */
  async deleteConversation(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/conversations/${id}`, {
      method: "DELETE",
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Delete conversation failed: ${response.statusText}`);
    }
  }

  // ============= Phase 1: Targets Management =============

  /**
   * 动态添加 OpenAPI target
   */
  async addTarget(params: {
    name: string;
    base_url?: string;
    spec?: string;
    auth_type?: string;
    auth_token?: string;
    description?: string;
  }): Promise<{ message: string; tool_count: number }> {
    const response = await fetch(`${this.baseURL}/api/targets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
        base_url: params.base_url || "",
        spec: params.spec || "",
        auth_type: params.auth_type || "",
        auth_token: params.auth_token || "",
        description: params.description || "",
      }),
    });
    if (!response.ok) throw new Error(`Add target failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 列出所有配置的 OpenAPI targets
   */
  async listTargets(): Promise<Target[]> {
    const response = await fetch(`${this.baseURL}/api/targets`);
    if (!response.ok) throw new Error(`List targets failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 删除一个 target
   */
  async removeTarget(name: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/targets/${name}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Remove target failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 探测一个 URL，自动发现 OpenAPI spec
   */
  async probeTarget(baseUrl: string): Promise<{
    found: boolean;
    spec_url?: string;
    tool_count?: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseURL}/api/targets/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_url: baseUrl }),
    });
    if (!response.ok) throw new Error(`Probe target failed: ${response.statusText}`);
    return response.json();
  }

  // ============= Phase 2: Tools Management =============

  /**
   * 列出所有可用工具
   */
  async listTools(): Promise<Tool[]> {
    const response = await fetch(`${this.baseURL}/api/tools`);
    if (!response.ok) throw new Error(`List tools failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 列出所有工具源（OpenAPI / MCP）
   */
  async listToolSources(): Promise<ToolSource[]> {
    const response = await fetch(`${this.baseURL}/api/tools/sources`);
    if (!response.ok) throw new Error(`List tool sources failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 获取对话的工具配置
   */
  async getConversationTools(conversationId: string): Promise<{
    enabled_sources: string[];
    disabled_tools: string[];
  }> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/tools`);
    if (!response.ok) throw new Error(`Get conversation tools failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 更新对话的工具配置
   */
  async updateConversationTools(
    conversationId: string,
    params: {
      enabled_sources?: string[];
      disabled_tools?: string[];
    }
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/tools`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled_sources: params.enabled_sources || [],
        disabled_tools: params.disabled_tools || [],
      }),
    });
    if (!response.ok) throw new Error(`Update conversation tools failed: ${response.statusText}`);
    return response.json();
  }

  // ============= Phase 3: Message Editing & Regeneration =============

  /**
   * 编辑消息并从该点重新生成
   */
  async editMessage(
    conversationId: string,
    messageIndex: number,
    newContent: string,
    options: Omit<ChatOptions, "conversationId"> = {}
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/messages/${messageIndex}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = new Error(`Edit message failed: ${response.statusText}`);
      if (options.onError) {
        options.onError(error);
      } else if (this.onError) {
        this.onError(error);
      }
      throw error;
    }

    // 解析 SSE 流（与 chat 方法相同的逻辑）
    await this.handleSSEStream(response, options);
  }

  /**
   * 从某个消息索引开始重新生成
   */
  async regenerateFrom(
    conversationId: string,
    fromIndex: number,
    options: Omit<ChatOptions, "conversationId"> = {}
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_index: fromIndex }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = new Error(`Regenerate failed: ${response.statusText}`);
      if (options.onError) {
        options.onError(error);
      } else if (this.onError) {
        this.onError(error);
      }
      throw error;
    }

    // 解析 SSE 流
    await this.handleSSEStream(response, options);
  }

  /**
   * 删除单条消息
   */
  async deleteMessage(conversationId: string, messageIndex: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/messages/${messageIndex}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Delete message failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 删除从某个索引开始的所有消息
   */
  async deleteMessagesFrom(conversationId: string, messageIndex: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/messages/${messageIndex}/from`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Delete messages from failed: ${response.statusText}`);
    return response.json();
  }

  // ============= Phase 4: LLM Configuration =============

  /**
   * 获取当前 LLM 配置
   */
  async getLLMConfig(): Promise<LLMConfig> {
    const response = await fetch(`${this.baseURL}/api/config/llm`);
    if (!response.ok) throw new Error(`Get LLM config failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 更新 LLM 配置
   */
  async updateLLMConfig(params: {
    api_base: string;
    api_key?: string;
    model?: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/config/llm`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_base: params.api_base,
        api_key: params.api_key || "",
        model: params.model || "",
      }),
    });
    if (!response.ok) throw new Error(`Update LLM config failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 探测可用的 LLM 提供商（本地 + 云端）
   */
  async probeLLMProviders(): Promise<LLMProvider[]> {
    const response = await fetch(`${this.baseURL}/api/config/llm/providers`);
    if (!response.ok) throw new Error(`Probe LLM providers failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 获取指定 LLM 提供商的模型列表
   */
  async fetchModels(params: { api_base: string; api_key?: string }): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/api/config/llm/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_base: params.api_base,
        api_key: params.api_key || "",
      }),
    });
    if (!response.ok) throw new Error(`Fetch models failed: ${response.statusText}`);
    return response.json();
  }

  // ============= Phase 5: Proxy Configuration =============

  /**
   * 获取当前代理配置
   */
  async getProxyConfig(): Promise<ProxyConfig> {
    const response = await fetch(`${this.baseURL}/api/config/proxy`);
    if (!response.ok) throw new Error(`Get proxy config failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 更新代理配置
   */
  async updateProxyConfig(proxy: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/config/proxy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proxy }),
    });
    if (!response.ok) throw new Error(`Update proxy config failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * 测试代理连接
   */
  async testProxy(proxy: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/api/config/proxy/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proxy }),
    });
    if (!response.ok) throw new Error(`Test proxy failed: ${response.statusText}`);
    return response.json();
  }

  // ============= Private Helper Methods =============

  /**
   * 处理 SSE 流（用于 chat、editMessage、regenerateFrom）
   */
  private async handleSSEStream(response: Response, options: Omit<ChatOptions, "conversationId">): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith("event: ")) {
            continue;
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            try {
              const parsed = JSON.parse(data);

              // 特殊处理 done 事件
              if (parsed.conversation_id) {
                options.onDone?.(parsed.conversation_id);
                continue;
              }

              // 其他事件
              const event: ChatEvent = {
                type: this.inferEventType(parsed),
                data: parsed,
              };
              options.onEvent?.(event);
            } catch (e) {
              console.warn("Failed to parse SSE data:", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private inferEventType(data: any): ChatEventType {
    if (data.error) return "error";
    if (data.delta) return "content_delta";
    if (data.text) return "content";
    if (data.name && data.arguments) return "tool_call";
    if (data.name && data.result) return "tool_result";
    if (data.total_tokens) return "usage";
    return "content";
  }
}

// 默认导出
export default NLUIClient;
