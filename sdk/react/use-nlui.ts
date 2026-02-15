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
  type ChatMessage,
  type Target,
  type Tool,
  type ToolSource,
  type LLMConfig,
  type LLMProvider,
  type ProxyConfig
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
  onEvent?: (event: ChatEvent) => void;
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
            // 将完整事件传递给外部（如果需要）
            options.onEvent?.(event);
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

// ============= Phase 1: useTargets =============

export interface UseTargetsReturn {
  targets: Target[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  add: (target: Omit<Target, 'tool_count'> & { auth_token?: string }) => Promise<void>;
  remove: (name: string) => Promise<void>;
  probe: (baseUrl: string) => Promise<{
    found: boolean;
    spec_url?: string;
    tool_count?: number;
    message: string;
  }>;
}

export function useTargets(client: NLUIClient): UseTargetsReturn {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listTargets();
      setTargets(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const add = useCallback(
    async (target: Omit<Target, 'tool_count'> & { auth_token?: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.addTarget(target);
        await refresh();
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [client, refresh]
  );

  const remove = useCallback(
    async (name: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.removeTarget(name);
        setTargets((prev) => prev.filter((t) => t.name !== name));
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const probe = useCallback(
    async (baseUrl: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.probeTarget(baseUrl);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    targets,
    isLoading,
    error,
    refresh,
    add,
    remove,
    probe,
  };
}

// ============= Phase 2: useTools =============

export interface UseToolsReturn {
  tools: Tool[];
  sources: ToolSource[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getConversationTools: (conversationId: string) => Promise<{
    enabled_sources: string[];
    disabled_tools: string[];
  }>;
  updateConversationTools: (
    conversationId: string,
    config: {
      enabled_sources?: string[];
      disabled_tools?: string[];
    }
  ) => Promise<void>;
}

export function useTools(client: NLUIClient): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [sources, setSources] = useState<ToolSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [toolsData, sourcesData] = await Promise.all([
        client.listTools(),
        client.listToolSources(),
      ]);
      setTools(toolsData);
      setSources(sourcesData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getConversationTools = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const config = await client.getConversationTools(conversationId);
        return config;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const updateConversationTools = useCallback(
    async (
      conversationId: string,
      config: {
        enabled_sources?: string[];
        disabled_tools?: string[];
      }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.updateConversationTools(conversationId, config);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    tools,
    sources,
    isLoading,
    error,
    refresh,
    getConversationTools,
    updateConversationTools,
  };
}

// ============= Phase 4: useLLMConfig =============

export interface UseLLMConfigReturn {
  config: LLMConfig | null;
  providers: LLMProvider[];
  models: string[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (config: {
    api_base: string;
    api_key?: string;
    model?: string;
  }) => Promise<void>;
  probeProviders: () => Promise<void>;
  fetchModels: (apiBase: string, apiKey?: string) => Promise<void>;
}

export function useLLMConfig(client: NLUIClient): UseLLMConfigReturn {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getLLMConfig();
      setConfig(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const update = useCallback(
    async (newConfig: {
      api_base: string;
      api_key?: string;
      model?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.updateLLMConfig(newConfig);
        await refresh();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, refresh]
  );

  const probeProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.probeLLMProviders();
      setProviders(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const fetchModels = useCallback(
    async (apiBase: string, apiKey?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.fetchModels({ api_base: apiBase, api_key: apiKey });
        setModels(data);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    config,
    providers,
    models,
    isLoading,
    error,
    refresh,
    update,
    probeProviders,
    fetchModels,
  };
}

// ============= Phase 5: useProxy =============

export interface UseProxyReturn {
  config: ProxyConfig | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (proxy: string) => Promise<void>;
  test: (proxy: string) => Promise<{ message: string }>;
}

export function useProxy(client: NLUIClient): UseProxyReturn {
  const [config, setConfig] = useState<ProxyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getProxyConfig();
      setConfig(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const update = useCallback(
    async (proxy: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.updateProxyConfig(proxy);
        await refresh();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, refresh]
  );

  const test = useCallback(
    async (proxy: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.testProxy(proxy);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    config,
    isLoading,
    error,
    refresh,
    update,
    test,
  };
}
