# @nlui/vue-ui

NLUI Vue UI Components - 完整的聊天界面组件库

## 安装

```bash
npm install @nlui/vue-ui
# or
pnpm add @nlui/vue-ui
```

## 使用

### 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ChatInterface, ThemeProvider } from '@nlui/vue-ui';
import { useNLUI, useConversations } from '@nlui/vue';
import '@nlui/vue-ui/styles';

const client = useNLUI({ baseURL: 'http://localhost:9000' });
const conversations = useConversations(client);
const conversationId = ref<string | null>(null);

const handleConversationChange = (id: string) => {
  conversationId.value = id || null;
};
</script>

<template>
  <ThemeProvider defaultTheme="light">
    <div class="h-screen">
      <ChatInterface
        :client="client"
        :conversationId="conversationId"
        :conversations="conversations"
        :showSidebar="true"
        :onConversationChange="handleConversationChange"
      />
    </div>
  </ThemeProvider>
</template>
```

## 组件

### 高层组件

- `ChatInterface` - 完整的聊天界面（集成了消息列表、输入框、侧栏）

### 中层组件

- `MessageList` - 消息列表
- `InputBox` - 输入框
- `ConversationSidebar` - 对话侧栏

### 底层组件

- `Message` - 消息路由器
- `UserMessage` - 用户消息
- `AssistantMessage` - 助手消息
- `ToolCallMessage` - 工具调用消息
- `ToolResultMessage` - 工具结果消息

### 渲染器

- `RichResult` - 智能 JSON 渲染器（自动识别表格、键值对、列表）
- `DataTable` - 表格渲染器
- `KVCard` - 键值对渲染器
- `BadgeList` - 标签列表渲染器

### UI 组件

- `Button`, `Card`, `Badge`, `Table`, `Textarea`, `Input`

### 主题

- `ThemeProvider` - 主题提供器
- `useTheme` - 主题 composable

## 特性

- ✅ 完整的聊天界面
- ✅ 工具调用支持
- ✅ 智能 JSON 渲染（表格、键值对、列表自动识别）
- ✅ nlui fence blocks 支持（`` ```nlui:table ``）
- ✅ 流式输出
- ✅ 错误处理
- ✅ 主题切换（light/dark）
- ✅ 对话管理
- ✅ 完整 TypeScript 支持

## API

### ChatInterface Props

```typescript
interface ChatInterfaceProps {
  client: NLUIClient;              // SDK 客户端实例
  conversationId?: string | null;  // 当前对话 ID
  conversations?: UseConversationsReturn;  // 对话列表
  showSidebar?: boolean;           // 是否显示侧栏
  theme?: "light" | "dark";        // 主题
  onConversationChange?: (id: string) => void;  // 对话切换回调
}
```

## 构建产物

- `dist/vue-ui.es.js` - ESM (449KB)
- `dist/vue-ui.umd.js` - UMD (298KB)
- `dist/style.css` - 样式 (60KB)
- TypeScript 类型定义完整

## License

MIT
