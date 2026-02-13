# NLUI Vue SDK

Vue 3 Composition API for NLUI (Natural Language User Interface) - 响应式聊天与工具管理。

## ✨ 特性

- ✅ **Vue 3 Composition API** - 完整的 composables 支持
- ✅ **响应式状态管理** - 基于 `ref` 和 `reactive`
- ✅ **TypeScript 类型安全** - 完整的类型定义
- ✅ **SSE 流式支持** - 实时接收 LLM 响应
- ✅ **Phase 1-5 完整功能** - 30+ 方法，100% 功能对等
- ✅ **自动状态更新** - 无需手动管理状态

## 📦 安装

```bash
npm install @nlui/vue
# 或
yarn add @nlui/vue
# 或
pnpm add @nlui/vue
```

## 🚀 快速开始

### 基础聊天

```vue
<script setup lang="ts">
import { useNLUI, useChat } from '@nlui/vue';

const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { messages, isLoading, send } = useChat(client);

const userInput = ref('');

const handleSend = async () => {
  await send(userInput.value);
  userInput.value = '';
};
</script>

<template>
  <div class="chat-container">
    <div v-for="msg in messages" :key="msg.id" :class="msg.role">
      {{ msg.content }}
    </div>

    <input v-model="userInput" @keyup.enter="handleSend" :disabled="isLoading" />
    <button @click="handleSend" :disabled="isLoading">
      {{ isLoading ? '发送中...' : '发送' }}
    </button>
  </div>
</template>
```

### 完整示例

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import {
  useNLUI,
  useChat,
  useConversations,
  useTargets,
  useTools,
  useLLMConfig,
  useProxy,
} from '@nlui/vue';

// 创建客户端
const client = useNLUI({ baseURL: 'http://localhost:9000' });

// 聊天管理
const { messages, isLoading, send } = useChat(client);

// 对话列表
const conversations = useConversations(client);

// Target 管理
const targets = useTargets(client);

// 工具管理
const tools = useTools(client);

// LLM 配置
const llmConfig = useLLMConfig(client);

// 代理配置
const proxy = useProxy(client);

onMounted(async () => {
  // 加载数据
  await conversations.load();
  await targets.load();
  await tools.loadTools();
  await tools.loadSources();
  await llmConfig.load();
  await proxy.load();
});

// 添加 Target
const handleAddTarget = async () => {
  await targets.add({
    name: 'github',
    baseUrl: 'https://api.github.com',
    spec: 'https://api.github.com/openapi.json',
    authType: 'bearer',
    token: 'ghp_xxx',
  });
};

// 配置工具
const handleConfigureTools = async (conversationId: string) => {
  await tools.updateConversationTools(conversationId, {
    enabled_sources: ['github'],
    disabled_tools: [],
  });
};

// 更新 LLM
const handleUpdateLLM = async () => {
  await llmConfig.update({
    api_base: 'https://api.openai.com/v1',
    api_key: 'sk-xxx',
    model: 'gpt-4',
  });
};
</script>

<template>
  <div class="app">
    <!-- 聊天界面 -->
    <div class="chat-panel">
      <div v-for="msg in messages" :key="msg.id">
        {{ msg.content }}
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="conversations-panel">
      <div v-for="conv in conversations.conversations.value" :key="conv.id">
        {{ conv.title }}
      </div>
    </div>

    <!-- Targets 列表 -->
    <div class="targets-panel">
      <div v-for="target in targets.targets.value" :key="target.name">
        {{ target.name }}
      </div>
    </div>

    <!-- 工具列表 -->
    <div class="tools-panel">
      <div v-for="tool in tools.tools.value" :key="tool.name">
        {{ tool.name }}
      </div>
    </div>
  </div>
</template>
```

## 📚 API 文档

### useNLUI(config)

创建 NLUI 客户端实例。

```typescript
const client = useNLUI({
  baseURL: 'http://localhost:9000',
  apiKey: 'optional-api-key',
});
```

---

### useChat(client, options?)

管理聊天状态和流式响应。

**返回值：**
```typescript
{
  messages: Ref<Message[]>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  conversationId: Ref<string | null>,
  send: (message: string) => Promise<void>,
  clear: () => void
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { messages, send, isLoading } = useChat(client, {
  onEvent: (event) => {
    console.log('Event:', event.type, event.data);
  },
});

await send('你好');
</script>
```

---

### useConversations(client)

管理对话列表。

**返回值：**
```typescript
{
  conversations: Ref<Conversation[]>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  load: () => Promise<void>,
  create: (title?: string) => Promise<Conversation>,
  delete: (id: string) => Promise<void>
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { conversations, load, create, delete: deleteConv } = useConversations(client);

onMounted(() => load());

const newConversation = await create('新对话');
await deleteConv('conv-id-123');
</script>
```

---

### useTargets(client)

管理 OpenAPI targets。

**返回值：**
```typescript
{
  targets: Ref<any[]>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  load: () => Promise<void>,
  add: (target: Target) => Promise<void>,
  remove: (name: string) => Promise<void>,
  probe: (url: string) => Promise<any>
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { targets, add, remove, probe } = useTargets(client);

// 添加 target
await add({
  name: 'github',
  baseUrl: 'https://api.github.com',
  spec: 'https://api.github.com/openapi.json',
});

// 探测 target
const result = await probe('https://api.example.com');
console.log('Found:', result.found);

// 删除 target
await remove('github');
</script>
```

---

### useTools(client)

管理工具和工具源。

**返回值：**
```typescript
{
  tools: Ref<Tool[]>,
  sources: Ref<ToolSource[]>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  loadTools: () => Promise<void>,
  loadSources: () => Promise<void>,
  updateConversationTools: (
    conversationId: string,
    config: { enabled_sources?: string[]; disabled_tools?: string[] }
  ) => Promise<void>
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { tools, sources, loadTools, updateConversationTools } = useTools(client);

onMounted(() => {
  loadTools();
  loadSources();
});

// 配置对话工具
await updateConversationTools('conv-id', {
  enabled_sources: ['github'],
  disabled_tools: ['delete_repo'],
});
</script>
```

---

### useLLMConfig(client)

管理 LLM 配置。

**返回值：**
```typescript
{
  config: Ref<LLMConfig | null>,
  providers: Ref<any[]>,
  models: Ref<string[]>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  load: () => Promise<void>,
  update: (config: LLMConfig) => Promise<void>,
  probeProviders: () => Promise<any[]>,
  fetchModels: (apiBase: string, apiKey?: string) => Promise<string[]>
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { config, update, probeProviders, fetchModels } = useLLMConfig(client);

// 更新配置
await update({
  api_base: 'https://api.openai.com/v1',
  api_key: 'sk-xxx',
  model: 'gpt-4',
});

// 探测本地提供商
const providers = await probeProviders();

// 获取模型列表
const models = await fetchModels('https://api.openai.com/v1', 'sk-xxx');
</script>
```

---

### useProxy(client)

管理代理配置。

**返回值：**
```typescript
{
  config: Ref<{ url: string } | null>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>,
  load: () => Promise<void>,
  update: (proxyURL: string) => Promise<void>,
  test: (proxyURL: string) => Promise<any>
}
```

**示例：**
```vue
<script setup>
const client = useNLUI({ baseURL: 'http://localhost:9000' });
const { config, update, test } = useProxy(client);

// 更新代理
await update('http://127.0.0.1:7890');

// 测试代理
const result = await test('http://127.0.0.1:7890');
console.log('Success:', result.success);
</script>
```

---

## 🎯 完整示例应用

查看 `examples/vue-example.vue` 获取完整的可运行示例。

```bash
cd sdk/vue
npm install
npm run dev
```

---

## 🏗️ 架构设计

```
┌─────────────────────────┐
│      Vue 3 应用          │
│   (Your Components)     │
└───────────┬─────────────┘
            │ 使用 composables
            ▼
┌─────────────────────────┐
│    @nlui/vue Hooks      │
│  - useNLUI()            │
│  - useChat()            │
│  - useConversations()   │
│  - useTargets()         │
│  - useTools()           │
│  - useLLMConfig()       │
│  - useProxy()           │
└───────────┬─────────────┘
            │ 调用
            ▼
┌─────────────────────────┐
│    @nlui/client         │
│  (TypeScript HTTP)      │
└───────────┬─────────────┘
            │ HTTP / SSE
            ▼
┌─────────────────────────┐
│   NLUI HTTP Server      │
└─────────────────────────┘
```

---

## 🎨 与 Pinia 集成

```typescript
// stores/nlui.ts
import { defineStore } from 'pinia';
import { useNLUI, useChat } from '@nlui/vue';

export const useNLUIStore = defineStore('nlui', () => {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const chat = useChat(client);

  return {
    ...chat,
    client,
  };
});
```

```vue
<!-- Component.vue -->
<script setup>
import { useNLUIStore } from '@/stores/nlui';

const nlui = useNLUIStore();

nlui.send('你好');
</script>

<template>
  <div v-for="msg in nlui.messages" :key="msg.id">
    {{ msg.content }}
  </div>
</template>
```

---

## 📝 TypeScript 支持

完整的类型定义：

```typescript
import type {
  NLUIConfig,
  ChatEvent,
  Message,
  Conversation,
  Target,
  Tool,
  ToolSource,
  LLMConfig,
} from '@nlui/vue';
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

仓库地址：https://github.com/ZacharyZcR/NLUI

---

## 📝 License

MIT License
