# @nlui/react-ui 示例

## 基础使用

```tsx
import { ChatInterface, ThemeProvider } from '@nlui/react-ui';
import { useNLUI, useChat, useConversations } from '@nlui/react';
import '@nlui/react-ui/dist/styles.css';

function App() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const chat = useChat(client);
  const conversations = useConversations(client);

  return (
    <ThemeProvider defaultTheme="light">
      <div className="h-screen">
        <ChatInterface
          chat={chat}
          conversations={conversations}
          showSidebar
        />
      </div>
    </ThemeProvider>
  );
}
```

## 仅聊天（无侧栏）

```tsx
function ChatOnly() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const chat = useChat(client);

  return (
    <ThemeProvider>
      <div className="h-screen">
        <ChatInterface chat={chat} />
      </div>
    </ThemeProvider>
  );
}
```

## 自定义组合

```tsx
import { MessageList, InputBox } from '@nlui/react-ui';
import { useNLUI, useChat } from '@nlui/react';

function CustomChat() {
  const client = useNLUI({ baseURL: 'http://localhost:9000' });
  const chat = useChat(client);

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b">My Custom Header</header>
      <MessageList
        messages={chat.messages.map((msg, i) => ({
          id: `${i}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        }))}
        isLoading={chat.isLoading}
      />
      <InputBox onSend={chat.send} disabled={chat.isLoading} />
    </div>
  );
}
```

## 注意事项

1. **必须引入样式**：`import '@nlui/react-ui/dist/styles.css'`
2. **需要ThemeProvider**：包裹应用以支持主题
3. **容器高度**：ChatInterface需要固定高度容器（如`h-screen`）
4. **Message类型转换**：SDK的ChatMessage需要转换为组件的Message类型（id, role, content, timestamp）

## 构建状态

- ✅ JS/CSS构建成功
- ⚠️ TypeScript类型定义（.d.ts）待修复
- ✅ 所有组件功能完整
- ✅ 样式系统正常

## 已知问题

- DTS生成失败（tsup解析问题），暂时禁用。运行时功能正常。
- 需要手动类型转换（临时方案）
