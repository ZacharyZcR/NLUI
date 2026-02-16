# @nlui/react-ui Examples

## Basic Usage

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

## Chat Only (No Sidebar)

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

## Custom Composition

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

## Notes

1. **Styles required**: `import '@nlui/react-ui/dist/styles.css'`
2. **ThemeProvider needed**: Wrap your app for theme support
3. **Container height**: ChatInterface requires a fixed-height container (e.g. `h-screen`)
4. **Message type conversion**: SDK's ChatMessage needs to be converted to the component's Message type (id, role, content, timestamp)

## Build Status

- JS/CSS build successful
- TypeScript type definitions (.d.ts) pending fix
- All components fully functional
- Style system working

## Known Issues

- DTS generation fails (tsup resolution issue), temporarily disabled. Runtime functionality works fine.
- Manual type conversion needed (temporary workaround)
