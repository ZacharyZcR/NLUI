/**
 * NLUI React Hooks
 *
 * React 集成，提供 useNLUI, useChat, useConversations 等 hooks
 */

import { useState, useCallback, useRef, useEffect } from "react";
import NLUIClient, {
  type NLUIConfig,
  type Conversation,
  type ChatEvent,
  type ChatMessage
} from "../js/nlui-client";

// ============= useNLUI =============

export function useNLUI(config: NLUIConfig) {
  const clientRef = useRef<NLUIClient>();

  if (!clientRef.current) {
    clientRef.current = new NLUIClient(config);
  }

  return clientRef.current;
}

// ============= useChat =============

export interface UseChatOptions {
  conversationId?: string;
  onDone?: (conversationId: string) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  send: (message: string) => Promise<void>;
  clear: () => void;
  conversationId: string | null;
}

export function useChat(
  client: NLUIClient,
  options: UseChatOptions = {}
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    options.conversationId || null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string) => {
      if (isLoading) return;

      // 添加用户消息
      const userMessage: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // 创建 abort controller
      abortControllerRef.current = new AbortController();

      // 累积助手回复
      let assistantContent = "";

      try {
        await client.chat(message, {
          conversationId: conversationId || undefined,
          signal: abortControllerRef.current.signal,
          onEvent: (event: ChatEvent) => {
            if (event.type === "content_delta") {
              assistantContent += event.data.delta;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                  lastMsg.content = assistantContent;
                } else {
                  newMessages.push({ role: "assistant", content: assistantContent });
                }
                return newMessages;
              });
            } else if (event.type === "content") {
              assistantContent = event.data.text;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                  lastMsg.content = assistantContent;
                } else {
                  newMessages.push({ role: "assistant", content: assistantContent });
                }
                return newMessages;
              });
            }
          },
          onDone: (convId: string) => {
            setConversationId(convId);
            options.onDone?.(convId);
            setIsLoading(false);
          },
          onError: (err: Error) => {
            setError(err);
            setIsLoading(false);
          },
        });
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [client, conversationId, isLoading, options]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    send,
    clear,
    conversationId,
  };
}

// ============= useConversations =============

export interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (title: string) => Promise<Conversation>;
  deleteConv: (id: string) => Promise<void>;
}

export function useConversations(client: NLUIClient): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listConversations();
      setConversations(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const create = useCallback(
    async (title: string) => {
      const conv = await client.createConversation(title);
      setConversations((prev) => [conv, ...prev]);
      return conv;
    },
    [client]
  );

  const deleteConv = useCallback(
    async (id: string) => {
      await client.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    [client]
  );

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    conversations,
    isLoading,
    error,
    refresh,
    create,
    deleteConv,
  };
}
