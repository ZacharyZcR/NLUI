# Changelog

## v0.1.0 (2026-02-16)

### 🎉 首次发布

完整的 Vue 3 UI 组件库，从 @nlui/react-ui 移植并适配 Vue Composition API。

### ✨ 功能特性

- **完整聊天界面** - `<ChatInterface />` 一体化组件
- **工具调用支持** - 自动渲染 `tool_call` 和 `tool_result` 消息
- **智能 JSON 渲染** - 自动识别表格、键值对、列表等数据结构
- **nlui fence blocks** - 支持 `` ```nlui:table `` 特殊 markdown 块
- **流式输出** - SSE 流式传输支持
- **错误处理** - 自动显示错误信息
- **主题系统** - light/dark 模式切换
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
- `RichResult` - 智能 JSON 渲染入口
- `DataTable` - 表格渲染
- `KVCard` - 键值对渲染
- `BadgeList` - 标签列表渲染

**UI 基础组件**
- `Button`, `Card`, `Badge`, `Table`, `Textarea`, `Input`
- `ThemeProvider`, `useTheme`

### 🔧 技术栈

- Vue 3.5+ (Composition API)
- TypeScript 5.6+
- CSS Variables 主题系统
- md-editor-rt（Markdown 渲染）
- lucide-vue-next（图标）
- class-variance-authority + clsx + tailwind-merge（样式工具）

### 📝 构建产物

- `dist/vue-ui.es.js` (ESM) - 449KB
- `dist/vue-ui.umd.js` (UMD) - 298KB
- `dist/style.css` - 60KB
- TypeScript 类型定义完整

### 🐛 已知问题

无

### ⚠️ Breaking Changes

无（首次发布）
