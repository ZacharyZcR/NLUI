import { ref, computed, reactive, onUnmounted, watch, toRefs, Ref } from 'vue';
import NLUIClient from '@nlui/client';

// ==================== Types ====================

export interface NLUIConfig {
  baseURL: string;
  apiKey?: string;
}

export interface ChatEvent {
  type: string;
  data: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  name: string;
  baseUrl: string;
  spec?: string;
  authType?: string;
  token?: string;
  description?: string;
}

export interface Tool {
  targetName: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface ToolSource {
  name: string;
  tools: {
    name: string;
    display_name: string;
    description: string;
  }[];
}

export interface LLMConfig {
  api_base: string;
  api_key: string;
  model: string;
}

// ==================== useNLUI (Core Client) ====================

/**
 * Create and configure NLUI client instance
 */
export function useNLUI(config: NLUIConfig) {
  const client = ref<NLUIClient>(new NLUIClient(config));
  return client;
}

// ==================== useChat (Chat Management) ====================

export interface UseChatOptions {
  conversationId?: string;
  onEvent?: (event: ChatEvent) => void;
}

/**
 * Manage chat state and streaming
 */
export function useChat(client: Ref<NLUIClient>, options: UseChatOptions = {}) {
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const conversationId = ref<string | null>(options.conversationId || null);

  const send = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: message,
    });

    isLoading.value = true;
    error.value = null;

    let assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: '',
    };
    messages.value.push(assistantMessage);

    try {
      const convId = await client.value.chat(conversationId.value || undefined, message, {
        onEvent: (event) => {
          if (options.onEvent) options.onEvent(event);

          if (event.type === 'content_delta') {
            assistantMessage.content += event.data.delta;
          } else if (event.type === 'content') {
            assistantMessage.content = event.data.text;
          }
        },
        onDone: (cid) => {
          conversationId.value = cid;
        },
        onError: (err) => {
          error.value = err;
        },
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  const clear = () => {
    messages.value = [];
  };

  return {
    messages,
    isLoading,
    error,
    conversationId,
    send,
    clear,
  };
}

// ==================== useConversations (Conversation List) ====================

/**
 * Manage conversation list
 */
export function useConversations(client: Ref<NLUIClient>) {
  const conversations = ref<Conversation[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      conversations.value = await client.value.listConversations();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load conversations';
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (title?: string) => {
    try {
      const conv = await client.value.createConversation(title);
      conversations.value.unshift(conv);
      return conv;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create conversation';
      throw err;
    }
  };

  const deleteConv = async (id: string) => {
    try {
      await client.value.deleteConversation(id);
      conversations.value = conversations.value.filter((c) => c.id !== id);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete conversation';
      throw err;
    }
  };

  return {
    conversations,
    isLoading,
    error,
    load,
    create,
    delete: deleteConv,
  };
}

// ==================== useTargets (Target Management) ====================

/**
 * Manage OpenAPI targets
 */
export function useTargets(client: Ref<NLUIClient>) {
  const targets = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      targets.value = await client.value.listTargets();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load targets';
    } finally {
      isLoading.value = false;
    }
  };

  const add = async (target: Target) => {
    try {
      await client.value.addTarget(target);
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add target';
      throw err;
    }
  };

  const remove = async (name: string) => {
    try {
      await client.value.removeTarget(name);
      targets.value = targets.value.filter((t) => t.name !== name);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove target';
      throw err;
    }
  };

  const probe = async (url: string) => {
    try {
      return await client.value.probeTarget(url);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to probe target';
      throw err;
    }
  };

  return {
    targets,
    isLoading,
    error,
    load,
    add,
    remove,
    probe,
  };
}

// ==================== useTools (Tool Management) ====================

/**
 * Manage tools and tool sources
 */
export function useTools(client: Ref<NLUIClient>) {
  const tools = ref<Tool[]>([]);
  const sources = ref<ToolSource[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const loadTools = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      tools.value = await client.value.listTools();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tools';
    } finally {
      isLoading.value = false;
    }
  };

  const loadSources = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      sources.value = await client.value.listToolSources();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tool sources';
    } finally {
      isLoading.value = false;
    }
  };

  const updateConversationTools = async (
    conversationId: string,
    config: { enabled_sources?: string[]; disabled_tools?: string[] }
  ) => {
    try {
      await client.value.updateConversationTools(conversationId, config);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update conversation tools';
      throw err;
    }
  };

  return {
    tools,
    sources,
    isLoading,
    error,
    loadTools,
    loadSources,
    updateConversationTools,
  };
}

// ==================== useLLMConfig (LLM Configuration) ====================

/**
 * Manage LLM configuration
 */
export function useLLMConfig(client: Ref<NLUIClient>) {
  const config = ref<LLMConfig | null>(null);
  const providers = ref<any[]>([]);
  const models = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      config.value = await client.value.getLLMConfig();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load LLM config';
    } finally {
      isLoading.value = false;
    }
  };

  const update = async (newConfig: LLMConfig) => {
    try {
      await client.value.updateLLMConfig(newConfig);
      config.value = newConfig;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update LLM config';
      throw err;
    }
  };

  const probeProviders = async () => {
    try {
      providers.value = await client.value.probeLLMProviders();
      return providers.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to probe providers';
      throw err;
    }
  };

  const fetchModels = async (apiBase: string, apiKey?: string) => {
    try {
      models.value = await client.value.fetchModels({ api_base: apiBase, api_key: apiKey });
      return models.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch models';
      throw err;
    }
  };

  return {
    config,
    providers,
    models,
    isLoading,
    error,
    load,
    update,
    probeProviders,
    fetchModels,
  };
}

// ==================== useProxy (Proxy Configuration) ====================

/**
 * Manage proxy configuration
 */
export function useProxy(client: Ref<NLUIClient>) {
  const config = ref<{ url: string } | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      config.value = await client.value.getProxyConfig();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load proxy config';
    } finally {
      isLoading.value = false;
    }
  };

  const update = async (proxyURL: string) => {
    try {
      await client.value.updateProxyConfig(proxyURL);
      config.value = { url: proxyURL };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update proxy';
      throw err;
    }
  };

  const test = async (proxyURL: string) => {
    try {
      return await client.value.testProxy(proxyURL);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to test proxy';
      throw err;
    }
  };

  return {
    config,
    isLoading,
    error,
    load,
    update,
    test,
  };
}
