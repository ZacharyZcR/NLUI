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
  };
}
