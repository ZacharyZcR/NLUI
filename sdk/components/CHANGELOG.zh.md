# Changelog

## v0.1.0 (2026-02-16)

### 🎉 首次发布

完整的 Web Components UI 组件库，无框架依赖，基于 Lit。

### ✨ 功能特性

- **完整聊天界面** - `<nlui-chat-interface>` 一体化组件
- **工具调用支持** - 自动渲染 `tool_call` 和 `tool_result` 消息
- **智能 JSON 渲染** - 自动识别表格、键值对、列表等数据结构
- **nlui fence blocks** - 支持 `` ```nlui:table `` 特殊 markdown 块
- **流式输出** - SSE 流式传输支持
- **错误处理** - 自动显示错误信息
- **主题系统** - light/dark 模式切换
- **对话管理** - 侧栏对话列表
- **框架无关** - 可在任何框架中使用（React、Vue、原生 HTML）

### 📦 组件

**高层**
- `<nlui-chat-interface>` - 完整聊天界面

**中层**
- `<nlui-message-list>` - 消息列表
- `<nlui-input-box>` - 输入框
- `<nlui-conversation-sidebar>` - 对话侧栏

**底层**
- `<nlui-message>` - 消息路由
- `<nlui-user-message>`, `<nlui-assistant-message>`, `<nlui-tool-call-message>`, `<nlui-tool-result-message>`

**渲染器**
- `<nlui-rich-result>` - 智能 JSON 渲染入口
- `<nlui-data-table>` - 表格渲染
- `<nlui-kv-card>` - 键值对渲染
- `<nlui-badge-list>` - 标签列表渲染

**UI 基础组件**
- `<nlui-button>`, `<nlui-card>`, `<nlui-badge>`, `<nlui-table>`, `<nlui-textarea>`, `<nlui-input>`

### 🔧 技术栈

- Lit 3.3+ (Web Components)
- TypeScript 5.6+
- Light DOM 模式（无 Shadow DOM，支持全局样式）
- md-editor-rt（Markdown 渲染）
- class-variance-authority + clsx + tailwind-merge（样式工具）

### 📝 构建产物

- `dist/nlui-components.js` (ESM) - 168KB
- `dist/nlui-components.css` - 69B
- TypeScript 类型定义完整

### 🐛 已知问题

无

### ⚠️ Breaking Changes

无（首次发布）
