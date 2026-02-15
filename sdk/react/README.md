# NLUI React Hooks

React hooks for NLUI，提供完整的类型安全的 React 集成。

## 安装

```bash
npm install @nlui/react @nlui/client
# 或
yarn add @nlui/react @nlui/client
```

## 快速开始

```tsx
import { useNLUI, useChat } from '@nlui/react';

function ChatComponent() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const { messages, isLoading, send } = useChat(client);

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button onClick={() => send('你好')} disabled={isLoading}>
        发送
      </button>
    </div>
  );
}
```

## 基础 Hooks

### useNLUI

创建并复用 NLUI 客户端实例。

```tsx
import { useNLUI } from '@nlui/react';

function App() {
  const client = useNLUI({
    baseURL: 'http://localhost:9000',
    apiKey: 'optional-api-key'
  });

  // 使用 client...
}
```

### useChat

管理聊天对话和消息流。

```tsx
import { useChat } from '@nlui/react';

function ChatInterface() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    messages,      // 消息列表
    isLoading,     // 加载状态
    error,         // 错误信息
    send,          // 发送消息
    clear,         // 清空对话
    conversationId // 当前对话 ID
  } = useChat(client, {
    conversationId: 'existing-conv-id', // 可选：使用现有对话
    onDone: (convId) => console.log('Done:', convId)
  });

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {error && <div className="error">{error.message}</div>}

      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            send(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        disabled={isLoading}
        placeholder="输入消息..."
      />

      <button onClick={clear}>清空</button>
    </div>
  );
}
```

### useConversations

管理对话列表。

```tsx
import { useConversations } from '@nlui/react';

function ConversationList() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    conversations, // 对话列表
    isLoading,     // 加载状态
    error,         // 错误信息
    refresh,       // 刷新列表
    create,        // 创建新对话
    deleteConv     // 删除对话
  } = useConversations(client);

  const handleCreate = async () => {
    const conv = await create('新对话');
    console.log('Created:', conv.id);
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isLoading}>
        新建对话
      </button>

      {conversations.map((conv) => (
        <div key={conv.id}>
          <span>{conv.title}</span>
          <button onClick={() => deleteConv(conv.id)}>删除</button>
        </div>
      ))}

      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

## Phase 1: useTargets

动态管理 OpenAPI targets。

```tsx
import { useTargets } from '@nlui/react';

function TargetsManager() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    targets,   // Target 列表
    isLoading,
    error,
    refresh,   // 刷新列表
    add,       // 添加 target
    remove,    // 删除 target
    probe      // 探测 OpenAPI spec
  } = useTargets(client);

  const handleAdd = async () => {
    await add({
      name: 'github',
      base_url: 'https://api.github.com',
      spec: 'https://api.github.com/openapi.json',
      auth_type: 'bearer',
      auth_token: 'ghp_xxx',
      description: 'GitHub API'
    });
  };

  const handleProbe = async () => {
    const result = await probe('https://api.example.com');
    if (result.found) {
      console.log(`Found ${result.tool_count} tools at ${result.spec_url}`);
    }
  };

  return (
    <div>
      <button onClick={handleAdd}>添加 GitHub</button>
      <button onClick={handleProbe}>探测 API</button>

      {targets.map((target) => (
        <div key={target.name}>
          <h3>{target.name}</h3>
          <p>{target.base_url}</p>
          <p>{target.tool_count} 个工具</p>
          <button onClick={() => remove(target.name)}>删除</button>
        </div>
      ))}
    </div>
  );
}
```

## Phase 2: useTools

管理工具和工具源。

```tsx
import { useTools } from '@nlui/react';

function ToolsManager() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    tools,                    // 所有工具
    sources,                  // 工具源列表
    isLoading,
    error,
    refresh,
    getConversationTools,     // 获取对话工具配置
    updateConversationTools   // 更新对话工具配置
  } = useTools(client);

  const handleUpdateTools = async (conversationId: string) => {
    await updateConversationTools(conversationId, {
      enabled_sources: ['github', 'gitlab'],
      disabled_tools: ['delete_repo']
    });
  };

  return (
    <div>
      <h2>工具源</h2>
      {sources.map((source) => (
        <div key={source.name}>
          {source.name} [{source.type}]: {source.tool_count} 个工具
        </div>
      ))}

      <h2>所有工具</h2>
      {tools.map((tool) => (
        <div key={tool.name}>
          <strong>{tool.name}</strong> ({tool.source})
          <p>{tool.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## Phase 4: useLLMConfig

管理 LLM 配置。

```tsx
import { useLLMConfig } from '@nlui/react';

function LLMConfigPanel() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    config,          // 当前 LLM 配置
    providers,       // 可用提供商
    models,          // 可用模型列表
    isLoading,
    error,
    refresh,
    update,          // 更新配置
    probeProviders,  // 探测提供商
    fetchModels      // 获取模型列表
  } = useLLMConfig(client);

  const handleUpdateConfig = async () => {
    await update({
      api_base: 'https://api.openai.com/v1',
      api_key: 'sk-xxx',
      model: 'gpt-4'
    });
  };

  const handleProbeProviders = async () => {
    await probeProviders();
  };

  const handleFetchModels = async () => {
    await fetchModels('https://api.openai.com/v1', 'sk-xxx');
  };

  return (
    <div>
      <h2>当前配置</h2>
      {config && (
        <div>
          <p>API Base: {config.api_base}</p>
          <p>Model: {config.model}</p>
        </div>
      )}

      <button onClick={handleUpdateConfig}>更新配置</button>
      <button onClick={handleProbeProviders}>探测提供商</button>

      <h3>可用提供商</h3>
      {providers.map((provider) => (
        <div key={provider.name}>
          {provider.name}: {provider.url}
        </div>
      ))}

      <h3>可用模型</h3>
      {models.map((model) => (
        <div key={model}>{model}</div>
      ))}
    </div>
  );
}
```

## Phase 5: useProxy

管理代理配置。

```tsx
import { useProxy } from '@nlui/react';

function ProxySettings() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const {
    config,    // 当前代理配置
    isLoading,
    error,
    refresh,
    update,    // 更新代理
    test       // 测试代理
  } = useProxy(client);

  const handleUpdate = async () => {
    await update('http://127.0.0.1:7890');
  };

  const handleTest = async () => {
    const result = await test('http://127.0.0.1:7890');
    console.log(result.message);
  };

  return (
    <div>
      <h2>代理配置</h2>
      {config && <p>当前代理: {config.proxy}</p>}

      <input
        type="text"
        placeholder="http://127.0.0.1:7890"
        onBlur={(e) => update(e.target.value)}
      />

      <button onClick={handleTest}>测试连接</button>
    </div>
  );
}
```

## 完整示例：动态 API 集成应用

```tsx
import React, { useState } from 'react';
import {
  useNLUI,
  useTargets,
  useTools,
  useChat,
  useLLMConfig,
  useConversations
} from '@nlui/react';

function DynamicAPIApp() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  // 所有 hooks
  const targets = useTargets(client);
  const tools = useTools(client);
  const llmConfig = useLLMConfig(client);
  const conversations = useConversations(client);
  const chat = useChat(client, {
    conversationId: currentConvId || undefined,
    onDone: setCurrentConvId
  });

  // 1. 添加 GitHub API
  const addGitHub = async () => {
    const probe = await targets.probe('https://api.github.com');
    if (probe.found) {
      await targets.add({
        name: 'github',
        base_url: 'https://api.github.com',
        spec: probe.spec_url!,
        auth_type: 'bearer',
        auth_token: process.env.GITHUB_TOKEN!
      });
    }
  };

  // 2. 配置 LLM
  const configureLLM = async () => {
    await llmConfig.update({
      api_base: 'https://api.openai.com/v1',
      api_key: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    });
  };

  // 3. 创建对话并限制工具
  const startConversation = async () => {
    const conv = await conversations.create('GitHub 集成测试');
    await tools.updateConversationTools(conv.id, {
      enabled_sources: ['github']
    });
    setCurrentConvId(conv.id);
  };

  return (
    <div className="app">
      {/* 设置面板 */}
      <div className="setup-panel">
        <button onClick={addGitHub}>添加 GitHub API</button>
        <button onClick={configureLLM}>配置 LLM</button>
        <button onClick={startConversation}>开始对话</button>
      </div>

      {/* Targets */}
      <div className="targets">
        <h2>API Targets</h2>
        {targets.targets.map((t) => (
          <div key={t.name}>{t.name} - {t.tool_count} 工具</div>
        ))}
      </div>

      {/* 聊天界面 */}
      <div className="chat">
        {chat.messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
        <input
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              chat.send(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          disabled={chat.isLoading}
        />
      </div>
    </div>
  );
}
```

## TypeScript 支持

所有 hooks 都提供完整的 TypeScript 类型：

```tsx
import type {
  UseTargetsReturn,
  UseToolsReturn,
  UseLLMConfigReturn,
  UseProxyReturn,
  UseChatReturn,
  UseConversationsReturn
} from '@nlui/react';
```

## 错误处理

所有 hooks 都提供 `error` 状态：

```tsx
const { error, isLoading } = useTargets(client);

if (error) {
  return <div>Error: {error.message}</div>;
}

if (isLoading) {
  return <div>Loading...</div>;
}
```

## 功能对等性

React Hooks 提供所有 SDK 功能的 React 集成：

- ✅ **useNLUI** - 客户端管理
- ✅ **useChat** - 聊天对话
- ✅ **useConversations** - 对话管理
- ✅ **useTargets** - Targets 动态管理（Phase 1）
- ✅ **useTools** - 工具管理（Phase 2）
- ✅ **useLLMConfig** - LLM 配置管理（Phase 4）
- ✅ **useProxy** - 代理配置（Phase 5）

**总计：7 个 hooks，100% 功能对等**

## 性能优化

所有 hooks 都使用了适当的 memoization：

- `useCallback` 用于函数稳定性
- `useRef` 用于客户端实例复用
- `useEffect` 用于自动数据加载
- 避免不必要的重新渲染

## 最佳实践

1. **单一客户端实例**：在应用顶层创建一次 client
2. **错误边界**：使用 React Error Boundaries 处理错误
3. **加载状态**：始终检查 `isLoading` 状态
4. **类型安全**：利用 TypeScript 类型定义
5. **自动刷新**：大多数 hooks 会自动初始加载数据
