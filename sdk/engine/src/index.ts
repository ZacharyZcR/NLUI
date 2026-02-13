// Core factory
export { createEngine } from './engine.js';

// Client adapter (for @nlui/vue-ui ChatInterface compatibility)
export { createClientAdapter } from './adapter.js';

// Types
export type {
  Message, ToolCall, Tool, StreamChunk, Usage,
  AuthConfig, ParamInfo, Endpoint, TargetConfig,
  ToolSet, ToolSetEndpoint,
  Conversation, LLMConfig, EngineConfig,
  ConfirmFunc, EngineEvent, ChatOptions,
  StorageAdapter, NLUIEngine,
} from './types.js';

// Storage adapters
export { MemoryStorage, LocalStorageAdapter } from './conversation/storage.js';

// Internals (for advanced use)
export { LLMClient, newAutoClient } from './llm/client.js';
export type { LLMClientInterface } from './llm/client.js';
export { GeminiClient } from './llm/gemini.js';
export { ToolLoop } from './toolloop/loop.js';
export { GatewayCaller } from './gateway/caller.js';
export { buildTools, buildSetAuthTool } from './gateway/builder.js';
export { buildFromToolSet, parseToolSet } from './gateway/toolset.js';
export { loadSpec } from './gateway/openapi.js';
export { ConversationManager } from './conversation/manager.js';
export { buildSystemPrompt } from './prompt.js';
