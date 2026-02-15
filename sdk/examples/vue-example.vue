<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  useNLUI,
  useChat,
  useConversations,
  useTargets,
  useTools,
  useLLMConfig,
  useProxy,
  type Target,
} from '@nlui/vue';

// ==================== Setup ====================
const client = useNLUI({ baseURL: 'http://localhost:9000' });

// Phase 1-5 Composables
const chat = useChat(client, {
  onEvent: (event) => {
    console.log('Chat event:', event.type, event.data);
  },
});

const conversations = useConversations(client);
const targets = useTargets(client);
const tools = useTools(client);
const llmConfig = useLLMConfig(client);
const proxy = useProxy(client);

// ==================== UI State ====================
const userInput = ref('');
const newTargetName = ref('');
const newTargetURL = ref('');
const activeTab = ref('chat');

// ==================== Lifecycle ====================
onMounted(async () => {
  console.log('Loading initial data...');

  // Load all data in parallel
  await Promise.all([
    conversations.load(),
    targets.load(),
    tools.loadTools(),
    tools.loadSources(),
    llmConfig.load(),
    proxy.load(),
  ]);

  console.log('Data loaded:', {
    conversations: conversations.conversations.value.length,
    targets: targets.targets.value.length,
    tools: tools.tools.value.length,
  });
});

// ==================== Handlers ====================

// Chat
const handleSend = async () => {
  if (!userInput.value.trim()) return;
  await chat.send(userInput.value);
  userInput.value = '';
};

// Conversations
const handleNewConversation = async () => {
  await conversations.create();
  console.log('New conversation created');
};

const handleDeleteConversation = async (id: string) => {
  if (confirm('确定删除此对话？')) {
    await conversations.delete(id);
  }
};

// Targets
const handleAddTarget = async () => {
  if (!newTargetName.value || !newTargetURL.value) return;

  const target: Target = {
    name: newTargetName.value,
    baseUrl: newTargetURL.value,
  };

  await targets.add(target);
  newTargetName.value = '';
  newTargetURL.value = '';
  console.log('Target added');
};

const handleProbeTarget = async (url: string) => {
  const result = await targets.probe(url);
  console.log('Probe result:', result);
  alert(`Found: ${result.found}\nTools: ${result.tools || 0}`);
};

const handleRemoveTarget = async (name: string) => {
  if (confirm(`确定删除 ${name}？`)) {
    await targets.remove(name);
  }
};

// Tools
const handleConfigureTools = async () => {
  if (!chat.conversationId.value) return;

  await tools.updateConversationTools(chat.conversationId.value, {
    enabled_sources: ['github'],
    disabled_tools: [],
  });
  console.log('Tools configured');
};

// LLM Config
const handleUpdateLLM = async () => {
  await llmConfig.update({
    api_base: 'https://api.openai.com/v1',
    api_key: 'sk-xxx',
    model: 'gpt-4',
  });
  console.log('LLM config updated');
};

const handleProbeProviders = async () => {
  const providers = await llmConfig.probeProviders();
  console.log('Local providers:', providers);
};

// Proxy
const handleUpdateProxy = async () => {
  await proxy.update('http://127.0.0.1:7890');
  console.log('Proxy updated');
};

const handleTestProxy = async () => {
  const result = await proxy.test('http://127.0.0.1:7890');
  console.log('Proxy test:', result);
  alert(`Proxy test ${result.success ? '成功' : '失败'}`);
};
</script>

<template>
  <div class="app">
    <h1>NLUI Vue Example</h1>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
        聊天
      </button>
      <button :class="{ active: activeTab === 'conversations' }" @click="activeTab = 'conversations'">
        对话 ({{ conversations.conversations.value.length }})
      </button>
      <button :class="{ active: activeTab === 'targets' }" @click="activeTab = 'targets'">
        Targets ({{ targets.targets.value.length }})
      </button>
      <button :class="{ active: activeTab === 'tools' }" @click="activeTab = 'tools'">
        工具 ({{ tools.tools.value.length }})
      </button>
      <button :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">
        配置
      </button>
    </div>

    <!-- Chat Tab -->
    <div v-if="activeTab === 'chat'" class="tab-content">
      <h2>聊天</h2>

      <div class="messages">
        <div v-for="msg in chat.messages.value" :key="msg.id" :class="`message ${msg.role}`">
          <strong>{{ msg.role }}:</strong>
          <pre>{{ msg.content }}</pre>
        </div>
      </div>

      <div class="chat-input">
        <input
          v-model="userInput"
          @keyup.enter="handleSend"
          :disabled="chat.isLoading.value"
          placeholder="输入消息..."
        />
        <button @click="handleSend" :disabled="chat.isLoading.value">
          {{ chat.isLoading.value ? '发送中...' : '发送' }}
        </button>
      </div>

      <div v-if="chat.conversationId.value" class="info">
        Conversation ID: {{ chat.conversationId.value }}
      </div>
    </div>

    <!-- Conversations Tab -->
    <div v-if="activeTab === 'conversations'" class="tab-content">
      <h2>对话列表</h2>

      <button @click="handleNewConversation">新建对话</button>

      <div class="list">
        <div v-for="conv in conversations.conversations.value" :key="conv.id" class="item">
          <strong>{{ conv.title }}</strong>
          <small>{{ conv.id }}</small>
          <button @click="handleDeleteConversation(conv.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- Targets Tab -->
    <div v-if="activeTab === 'targets'" class="tab-content">
      <h2>API Targets</h2>

      <div class="form">
        <input v-model="newTargetName" placeholder="名称 (e.g., github)" />
        <input v-model="newTargetURL" placeholder="Base URL" />
        <button @click="handleAddTarget">添加</button>
      </div>

      <div class="list">
        <div v-for="target in targets.targets.value" :key="target.name" class="item">
          <strong>{{ target.name }}</strong>
          <p>{{ target.base_url }}</p>
          <button @click="handleProbeTarget(target.base_url)">探测</button>
          <button @click="handleRemoveTarget(target.name)">删除</button>
        </div>
      </div>
    </div>

    <!-- Tools Tab -->
    <div v-if="activeTab === 'tools'" class="tab-content">
      <h2>工具管理</h2>

      <button @click="tools.loadTools()">刷新工具</button>
      <button @click="tools.loadSources()">刷新工具源</button>
      <button @click="handleConfigureTools" :disabled="!chat.conversationId.value">
        配置当前对话工具
      </button>

      <h3>工具列表 ({{ tools.tools.value.length }})</h3>
      <div class="list">
        <div v-for="tool in tools.tools.value" :key="tool.name" class="item">
          <strong>{{ tool.name }}</strong>
          <p>{{ tool.description }}</p>
        </div>
      </div>

      <h3>工具源 ({{ tools.sources.value.length }})</h3>
      <div class="list">
        <div v-for="source in tools.sources.value" :key="source.name" class="item">
          <strong>{{ source.name }}</strong>
          <p>{{ source.tools.length }} tools</p>
        </div>
      </div>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <h2>配置管理</h2>

      <h3>LLM 配置</h3>
      <div v-if="llmConfig.config.value">
        <p><strong>Model:</strong> {{ llmConfig.config.value.model }}</p>
        <p><strong>API Base:</strong> {{ llmConfig.config.value.api_base }}</p>
      </div>
      <button @click="handleUpdateLLM">更新 LLM</button>
      <button @click="handleProbeProviders">探测本地提供商</button>

      <h3>代理配置</h3>
      <div v-if="proxy.config.value">
        <p><strong>URL:</strong> {{ proxy.config.value.url || '未配置' }}</p>
      </div>
      <button @click="handleUpdateProxy">更新代理</button>
      <button @click="handleTestProxy">测试代理</button>
    </div>

    <!-- Error Display -->
    <div v-if="chat.error.value" class="error">
      {{ chat.error.value }}
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: system-ui, sans-serif;
}

h1 {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  border-bottom-color: #007bff;
  font-weight: bold;
}

.tab-content {
  padding: 20px 0;
}

.messages {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 6px;
}

.message.user {
  background: #e3f2fd;
}

.message.assistant {
  background: #f5f5f5;
}

.message pre {
  white-space: pre-wrap;
  margin: 5px 0 0 0;
}

.chat-input {
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.chat-input button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.list {
  margin-top: 15px;
}

.item {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 10px;
}

.item button {
  margin-right: 10px;
  margin-top: 10px;
}

.form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
}

.info {
  margin-top: 10px;
  padding: 10px;
  background: #e8f5e9;
  border-radius: 6px;
  font-size: 14px;
}

button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}
</style>
