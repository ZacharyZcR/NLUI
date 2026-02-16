# Changelog

## v0.2.0 (2026-02-15)

### 🎉 首次发布

完整的React UI组件库，从桌面端抽离并去Wails化。

### ✨ 功能特性

- **完整聊天界面** - `<ChatInterface />` 一体化组件
- **工具调用支持** - 自动渲染 `tool_call` 和 `tool_result` 消息
- **智能JSON渲染** - 自动识别表格、键值对、列表等数据结构
- **kelper fence blocks** - 支持 `` ```kelper:table `` 特殊markdown块
- **流式输出** - SSE流式传输支持
- **错误处理** - 自动显示错误信息
- **主题系统** - light/dark模式切换
- **对话管理** - 侧栏对话列表

### 📦 组件

**高层**
- `ChatInterface` - 完整聊天界面

**中层**
- `MessageList` - 消息列表
- `InputBox` - 输入框
- `ConversationSidebar` - 对话侧栏

**底层**
- `Message` - 消息路由
- `UserMessage`, `AssistantMessage`, `ToolCallMessage`, `ToolResultMessage`

**渲染器**
- `RichResult` - 智能JSON渲染入口
- `DataTable` - 表格渲染
- `KVCard` - 键值对渲染
- `BadgeList` - 标签列表渲染

**UI基础组件**
- `Button`, `Card`, `Badge`, `Table`, `Textarea`, `Input`
- `ThemeProvider`, `useTheme`

### 🔧 技术栈

- React 18+
- TypeScript 5.6+
- CSS Variables主题系统
- md-editor-rt（Markdown渲染）
- lucide-react（图标）
- class-variance-authority + clsx + tailwind-merge（样式工具）

### 📝 构建产物

- `dist/index.js` (CJS) - 48KB
- `dist/index.mjs` (ESM) - 40KB
- `dist/styles.css` - 4KB
- TypeScript类型定义完整

### 🐛 已知问题

无

### ⚠️ Breaking Changes

无（首次发布）
