# NLUI JavaScript/TypeScript SDK

完整的 JavaScript/TypeScript SDK，支持浏览器和 Node.js 环境。

## 安装

```bash
npm install nlui-client
# 或
yarn add nlui-client
```

## 快速开始

```typescript
import NLUIClient from 'nlui-client';

const client = new NLUIClient({
  baseURL: 'http://localhost:9000'
});

// 发送聊天消息
await client.chat('你好', {
  onEvent: (event) => {
    if (event.type === 'content_delta') {
      console.log(event.data.delta);
    }
  },
  onDone: (conversationId) => {
    console.log('Done:', conversationId);
  }
});
```

## Phase 1: Targets 动态管理

```typescript
// 动态添加 OpenAPI target
await client.addTarget({
  name: 'github',
  base_url: 'https://api.github.com',
  spec: 'https://api.github.com/openapi.json',
  auth_type: 'bearer',
  auth_token: 'ghp_xxx',
  description: 'GitHub API'
});

// 列出所有 targets
const targets = await client.listTargets();
console.log(targets);

// 删除 target
await client.removeTarget('github');

// 探测 OpenAPI spec
const result = await client.probeTarget('https://api.example.com');
if (result.found) {
  console.log(`Found spec at: ${result.spec_url}`);
  console.log(`Tool count: ${result.tool_count}`);
}
```

## Phase 2: 工具管理

```typescript
// 列出所有可用工具
const tools = await client.listTools();
tools.forEach(tool => {
  console.log(`${tool.name} (${tool.source}): ${tool.description}`);
});

// 列出工具源
const sources = await client.listToolSources();
sources.forEach(source => {
  console.log(`${source.name} [${source.type}]: ${source.tool_count} tools`);
});

// 更新对话工具配置
await client.updateConversationTools(conversationId, {
  enabled_sources: ['github', 'gitlab'],
  disabled_tools: ['delete_repo']
});

// 获取对话工具配置
const toolConfig = await client.getConversationTools(conversationId);
console.log('Enabled sources:', toolConfig.enabled_sources);
console.log('Disabled tools:', toolConfig.disabled_tools);
```

## Phase 3: 消息编辑与重新生成

```typescript
// 编辑消息并重新生成
await client.editMessage(conversationId, 2, '新的问题', {
  onEvent: (event) => {
    console.log(event);
  }
});

// 从某个索引开始重新生成
await client.regenerateFrom(conversationId, 3, {
  onEvent: (event) => {
    console.log(event);
  }
});

// 删除单条消息
await client.deleteMessage(conversationId, 5);

// 删除从某个索引开始的所有消息
await client.deleteMessagesFrom(conversationId, 3);
```

## Phase 4: LLM 配置管理

```typescript
// 获取当前 LLM 配置
const llmConfig = await client.getLLMConfig();
console.log(llmConfig);

// 更新 LLM 配置
await client.updateLLMConfig({
  api_base: 'https://api.openai.com/v1',
  api_key: 'sk-xxx',
  model: 'gpt-4'
});

// 探测可用的 LLM 提供商
const providers = await client.probeLLMProviders();
providers.forEach(provider => {
  console.log(`${provider.name}: ${provider.url}`);
});

// 获取模型列表
const models = await client.fetchModels({
  api_base: 'https://api.openai.com/v1',
  api_key: 'sk-xxx'
});
console.log('Available models:', models);
```

## Phase 5: 代理配置

```typescript
// 获取代理配置
const proxyConfig = await client.getProxyConfig();
console.log(proxyConfig.proxy);

// 更新代理配置
await client.updateProxyConfig('http://127.0.0.1:7890');

// 测试代理连接
const testResult = await client.testProxy('http://127.0.0.1:7890');
console.log(testResult.message);
```

## 完整示例：动态 API 集成

```typescript
import NLUIClient from 'nlui-client';

const client = new NLUIClient({
  baseURL: 'http://localhost:9000'
});

// 1. 探测并添加 API
const probeResult = await client.probeTarget('https://api.github.com');
if (probeResult.found) {
  await client.addTarget({
    name: 'github',
    base_url: 'https://api.github.com',
    spec: probeResult.spec_url!,
    auth_type: 'bearer',
    auth_token: process.env.GITHUB_TOKEN!
  });
}

// 2. 配置 LLM
await client.updateLLMConfig({
  api_base: 'https://api.openai.com/v1',
  api_key: process.env.OPENAI_API_KEY!,
  model: 'gpt-4'
});

// 3. 创建对话并限制工具
const conv = await client.createConversation('GitHub 集成测试');
await client.updateConversationTools(conv.id, {
  enabled_sources: ['github']
});

// 4. 开始对话
await client.chat('列出我的所有仓库', {
  conversationId: conv.id,
  onEvent: (event) => {
    if (event.type === 'content_delta') {
      process.stdout.write(event.data.delta);
    } else if (event.type === 'tool_call') {
      console.log('\n[工具调用]', event.data.name);
    } else if (event.type === 'tool_result') {
      console.log('[工具结果]', event.data.result);
    }
  }
});
```

## TypeScript 类型支持

SDK 提供完整的 TypeScript 类型定义：

```typescript
import NLUIClient, {
  Conversation,
  ChatMessage,
  ChatEvent,
  Target,
  Tool,
  ToolSource,
  LLMConfig,
  LLMProvider,
  ProxyConfig
} from 'nlui-client';
```

## 错误处理

```typescript
try {
  await client.chat('你好');
} catch (error) {
  console.error('Chat error:', error);
}

// 或使用回调
await client.chat('你好', {
  onError: (error) => {
    console.error('Chat error:', error);
  }
});
```

## 浏览器环境注意事项

在浏览器中使用时，请确保：
1. NLUI 服务器配置了 CORS
2. 使用 HTTPS（生产环境）
3. 不要在客户端代码中硬编码 API 密钥

## Node.js 环境

在 Node.js 中，可能需要 polyfill `fetch`：

```typescript
// Node.js < 18
import fetch from 'node-fetch';
global.fetch = fetch;
```

Node.js 18+ 原生支持 `fetch`。

## 功能对等性

JavaScript SDK 与桌面端完全对等，支持所有 30 个功能：

- ✅ Phase 1: Targets 动态管理（4 个方法）
- ✅ Phase 2: 工具管理（4 个方法）
- ✅ Phase 3: 消息编辑与重新生成（4 个方法）
- ✅ Phase 4: LLM 配置管理（4 个方法）
- ✅ Phase 5: 代理配置（3 个方法）
- ✅ 基础功能（7 个方法）

**总计：26 个公共方法，100% 功能对等**
