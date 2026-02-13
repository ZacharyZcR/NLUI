# @nlui/react-ui

React UI components for NLUI - 开箱即用的聊天界面组件。

## 安装

```bash
npm install @nlui/react-ui @nlui/client
```

## 快速开始

```tsx
import { ChatInterface, ThemeProvider } from '@nlui/react-ui';
import { useNLUI, useConversations } from '@nlui/react';
import '@nlui/react-ui/dist/styles.css';
import { useState } from 'react';

function App() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const conversations = useConversations(client);
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <ThemeProvider defaultTheme="light">
      <div className="h-screen">
        <ChatInterface
          client={client}
          conversationId={conversationId}
          conversations={conversations}
          showSidebar
          onConversationChange={setConversationId}
        />
      </div>
    </ThemeProvider>
  );
}
```

## 组件

### 高层组件

- **`<ChatInterface />`** - 完整聊天界面（消息列表 + 输入框 + 侧栏）
  - Props:
    - `client` - NLUI client实例
    - `conversationId?` - 当前对话ID
    - `conversations?` - useConversations返回对象（用于侧栏）
    - `showSidebar?` - 是否显示侧栏
    - `theme?` - 主题（light/dark）
    - `onConversationChange?` - 对话切换回调

### 中层组件

- **`<MessageList />`** - 消息列表
- **`<InputBox />`** - 输入框
- **`<ConversationSidebar />`** - 对话侧栏

### 底层组件

- **`<Message />`** - 消息路由器
- **`<UserMessage />`** - 用户消息
- **`<AssistantMessage />`** - 助手消息
- **`<ToolCallMessage />`** - 工具调用消息
- **`<ToolResultMessage />`** - 工具结果消息

### 渲染器

- **`<RichResult />`** - 智能JSON渲染
- **`<DataTable />`** - 表格渲染
- **`<KVCard />`** - 键值对渲染
- **`<BadgeList />`** - 标签列表渲染

## 功能特性

✅ **完整工具调用支持** - 自动渲染tool_call和tool_result消息
✅ **智能JSON渲染** - 自动识别表格、键值对、列表等数据结构
✅ **nlui fence block** - 支持`` ```nlui:table ``等特殊markdown块
✅ **流式输出** - 支持SSE流式传输
✅ **错误处理** - 自动显示错误信息
✅ **主题切换** - 支持light/dark模式
✅ **对话管理** - 侧栏显示对话列表

## 样式

组件使用CSS变量主题系统，需要引入样式：

```tsx
import '@nlui/react-ui/dist/styles.css';
```

## 主题

```tsx
import { ThemeProvider, useTheme } from '@nlui/react-ui';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <YourApp />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}
```

## API变更

### v0.2.0 (当前)
- ⚠️ **Breaking**: `ChatInterface`现在直接接收`client`而不是`useChat`返回值
- ✅ 新增：完整工具调用消息支持（tool_call/tool_result）
- ✅ 新增：错误处理UI
- ✅ 新增：对话切换逻辑（`onConversationChange` prop）

## 许可

MIT
