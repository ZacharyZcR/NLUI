# @nlui/components

NLUI Web Components - Framework-agnostic UI components built with Lit

## 安装

```bash
npm install @nlui/components
# or
pnpm add @nlui/components
```

## 使用

### 完整示例 (纯 HTML + JavaScript)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NLUI Chat</title>
  <link rel="stylesheet" href="node_modules/@nlui/components/dist/nlui-components.css">
  <script type="module">
    import { NluiChatInterface } from './node_modules/@nlui/components/dist/nlui-components.js';
    import NLUIClient from './node_modules/@nlui/client/dist/nlui-client.js';

    const client = new NLUIClient({ baseURL: 'http://localhost:9000' });

    const chatInterface = document.querySelector('nlui-chat-interface');
    chatInterface.client = client;
    chatInterface.showSidebar = true;
    chatInterface.theme = 'light';

    // 监听对话切换事件
    chatInterface.addEventListener('conversation-change', (e) => {
      console.log('Conversation changed:', e.detail.id);
      chatInterface.conversationId = e.detail.id || null;
    });
  </script>
</head>
<body class="h-screen">
  <nlui-chat-interface></nlui-chat-interface>
</body>
</html>
```

### 与框架集成

#### React

```tsx
import '@nlui/components/dist/nlui-components.css';
import '@nlui/components';
import { useEffect, useRef } from 'react';
import NLUIClient from '@nlui/client';

function App() {
  const chatRef = useRef<any>(null);
  const clientRef = useRef(new NLUIClient({ baseURL: 'http://localhost:9000' }));

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.client = clientRef.current;
      chatRef.current.showSidebar = true;
    }
  }, []);

  return (
    <div className="h-screen">
      <nlui-chat-interface ref={chatRef} />
    </div>
  );
}
```

#### Vue

```vue
<template>
  <div class="h-screen">
    <nlui-chat-interface
      ref="chatRef"
      :show-sidebar="true"
      theme="light"
    />
  </div>
</template>

<script setup>
import '@nlui/components/dist/nlui-components.css';
import '@nlui/components';
import { onMounted, ref } from 'vue';
import NLUIClient from '@nlui/client';

const chatRef = ref(null);
const client = new NLUIClient({ baseURL: 'http://localhost:9000' });

onMounted(() => {
  if (chatRef.value) {
    chatRef.value.client = client;
  }
});
</script>
```

## 组件

### 高层组件

- `<nlui-chat-interface>` - 完整的聊天界面

### 中层组件

- `<nlui-message-list>` - 消息列表
- `<nlui-input-box>` - 输入框
- `<nlui-conversation-sidebar>` - 对话侧栏

### 底层组件

- `<nlui-message>` - 消息路由器
- `<nlui-user-message>` - 用户消息
- `<nlui-assistant-message>` - 助手消息
- `<nlui-tool-call-message>` - 工具调用消息
- `<nlui-tool-result-message>` - 工具结果消息

### 渲染器

- `<nlui-rich-result>` - 智能 JSON 渲染器
- `<nlui-data-table>` - 表格渲染器
- `<nlui-kv-card>` - 键值对渲染器
- `<nlui-badge-list>` - 标签列表渲染器

### UI 组件

- `<nlui-button>`, `<nlui-card>`, `<nlui-badge>`
- `<nlui-table>`, `<nlui-textarea>`, `<nlui-input>`

## 特性

- ✅ 无框架依赖（Web Components）
- ✅ 完整的聊天界面
- ✅ 工具调用支持
- ✅ 智能 JSON 渲染（表格、键值对、列表自动识别）
- ✅ nlui fence blocks 支持
- ✅ 流式输出
- ✅ 错误处理
- ✅ 主题切换（light/dark）
- ✅ 对话管理
- ✅ 完整 TypeScript 支持

## API

### `<nlui-chat-interface>` 属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `client` | `NLUIClient` | - | SDK 客户端实例（必需） |
| `conversation-id` | `string \| null` | `null` | 当前对话 ID |
| `show-sidebar` | `boolean` | `false` | 是否显示侧栏 |
| `theme` | `'light' \| 'dark'` | `'light'` | 主题 |

### 事件

- `conversation-change` - 对话切换时触发，`detail: { id: string }`
- `conversation-delete` - 删除对话时触发，`detail: { id: string }`

## 构建产物

- `dist/nlui-components.js` - ESM (168KB)
- `dist/nlui-components.css` - 样式 (69B，主样式在 JS 中内联)
- TypeScript 类型定义完整

## License

MIT
