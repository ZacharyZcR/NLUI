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
      options.onError?.(error) || this.onError?.(error);
      throw error;
    }

    // 解析 SSE 流
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
            const eventType = line.slice(7).trim();
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
