import type { NLUIEngine, Conversation, EngineEvent } from './types.js';

/**
 * Adapted conversation shape matching @nlui/client's Conversation interface.
 * Converts numeric timestamps to ISO strings.
 */
export interface ClientConversation {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string; tool_calls?: unknown[] }>;
  created_at: string;
  updated_at: string;
}

export interface ClientChatEvent {
  type: string;
  data: unknown;
}

export interface ClientChatOptions {
  conversationId?: string;
  onEvent?: (event: ClientChatEvent) => void;
  onDone?: (conversationId: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

function toClientConv(conv: Conversation): ClientConversation {
  return {
    id: conv.id,
    title: conv.title,
    messages: conv.messages,
    created_at: new Date(conv.createdAt).toISOString(),
    updated_at: new Date(conv.updatedAt).toISOString(),
  };
}

/**
 * Create an object that mimics the @nlui/client NLUIClient interface,
 * backed by a pure-TS NLUIEngine. Drop this into <ChatInterface :client="adapter" />.
 *
 * Usage:
 * ```ts
 * import { createEngine, createClientAdapter } from '@nlui/engine';
 * const engine = await createEngine({ ... });
 * const client = createClientAdapter(engine);
 * ```
 */
export function createClientAdapter(engine: NLUIEngine) {
  return {
    async chat(message: string, options: ClientChatOptions = {}): Promise<void> {
      await engine.chat(message, {
        conversationId: options.conversationId,
        onEvent: options.onEvent as ((event: EngineEvent) => void) | undefined,
        onDone: options.onDone,
        onError: options.onError,
        signal: options.signal,
      });
    },

    async getConversation(id: string): Promise<ClientConversation> {
      const conv = engine.getConversation(id);
      if (!conv) throw new Error('Conversation not found');
      return toClientConv(conv);
    },

    async listConversations(): Promise<ClientConversation[]> {
      return engine.listConversations().map(toClientConv);
    },

    async createConversation(title: string): Promise<ClientConversation> {
      return toClientConv(engine.createConversation(title));
    },

    async deleteConversation(id: string): Promise<void> {
      engine.deleteConversation(id);
    },

    async editMessage(
      conversationId: string,
      messageIndex: number,
      newContent: string,
      options: Omit<ClientChatOptions, 'conversationId'> = {},
    ): Promise<void> {
      engine.editMessage(conversationId, messageIndex, newContent);
      await engine.regenerateFrom(conversationId, messageIndex + 1, {
        onEvent: options.onEvent as ((event: EngineEvent) => void) | undefined,
        onDone: options.onDone,
        onError: options.onError,
        signal: options.signal,
      });
    },

    async regenerateFrom(
      conversationId: string,
      fromIndex: number,
      options: Omit<ClientChatOptions, 'conversationId'> = {},
    ): Promise<void> {
      await engine.regenerateFrom(conversationId, fromIndex, {
        onEvent: options.onEvent as ((event: EngineEvent) => void) | undefined,
        onDone: options.onDone,
        onError: options.onError,
        signal: options.signal,
      });
    },

    async deleteMessage(conversationId: string, messageIndex: number): Promise<{ message: string }> {
      engine.deleteMessage(conversationId, messageIndex);
      return { message: 'ok' };
    },

    async deleteMessagesFrom(conversationId: string, messageIndex: number): Promise<{ message: string }> {
      engine.deleteMessagesFrom(conversationId, messageIndex);
      return { message: 'ok' };
    },

    // ---- Settings methods ----

    async getLLMConfig() {
      const cfg = engine.getConfig();
      return {
        api_base: cfg.llm.apiBase,
        api_key: cfg.llm.apiKey,
        model: cfg.llm.model,
        stream: cfg.llm.stream !== false,
        language: cfg.language,
      };
    },

    async getProxyConfig() {
      return { proxy: engine.getConfig().proxy };
    },

    async updateLLMConfig(params: { api_base: string; api_key?: string; model?: string }) {
      const cfg = engine.getConfig();
      engine.updateLLMConfig(
        params.api_base,
        params.api_key ?? cfg.llm.apiKey,
        params.model ?? cfg.llm.model,
      );
      return { message: 'ok' };
    },

    async updateStream(stream: boolean) {
      engine.updateStream(stream);
      return { message: 'ok' };
    },

    async updateLanguage(lang: string) {
      engine.updateLanguage(lang as 'zh' | 'en' | 'ja');
      return { message: 'ok' };
    },

    async updateProxyConfig(proxy: string) {
      engine.updateProxy(proxy);
      return { message: 'ok' };
    },

    async testProxy(_proxy: string) {
      return { message: 'ok' };
    },

    async probeLLMProviders(): Promise<Array<{ name: string; api_base: string; models: string[] }>> {
      return [
        { name: 'Ollama', api_base: 'http://localhost:11434/v1', models: [] },
        { name: 'LM Studio', api_base: 'http://localhost:1234/v1', models: [] },
        { name: 'vLLM', api_base: 'http://localhost:8000/v1', models: [] },
        { name: 'OpenAI', api_base: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
        { name: 'DeepSeek', api_base: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
      ];
    },

    async fetchModels(params: { api_base: string; api_key?: string }): Promise<string[]> {
      const base = params.api_base.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (params.api_key) headers['Authorization'] = `Bearer ${params.api_key}`;
      const res = await fetch(`${base}/models`, { headers });
      if (!res.ok) return [];
      const json = await res.json();
      const data = json?.data;
      if (!Array.isArray(data)) return [];
      return data.map((m: { id?: string }) => m.id).filter(Boolean) as string[];
    },
  };
}
