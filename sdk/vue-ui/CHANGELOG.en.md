# Changelog

## v0.1.0 (2026-02-16)

### Initial Release

Complete Vue 3 UI component library, ported from @nlui/react-ui and adapted for Vue Composition API.

### Features

- **Full chat interface** - `<ChatInterface />` all-in-one component
- **Tool call support** - Automatic rendering of `tool_call` and `tool_result` messages
- **Smart JSON rendering** - Auto-detects tables, key-value pairs, lists, and other data structures
- **nlui fence blocks** - Supports `` ```nlui:table `` special markdown blocks
- **Streaming output** - SSE streaming support
- **Error handling** - Automatic error message display
- **Theme system** - light/dark mode toggle
- **Conversation management** - Sidebar conversation list

### Components

**High-level**
- `ChatInterface` - Complete chat interface

**Mid-level**
- `MessageList` - Message list
- `InputBox` - Input box
- `ConversationSidebar` - Conversation sidebar

**Low-level**
- `Message` - Message router
- `UserMessage`, `AssistantMessage`, `ToolCallMessage`, `ToolResultMessage`

**Renderers**
- `RichResult` - Smart JSON rendering entry point
- `DataTable` - Table rendering
- `KVCard` - Key-value pair rendering
- `BadgeList` - Tag list rendering

**Base UI components**
- `Button`, `Card`, `Badge`, `Table`, `Textarea`, `Input`
- `ThemeProvider`, `useTheme`

### Tech Stack

- Vue 3.5+ (Composition API)
- TypeScript 5.6+
- CSS Variables theme system
- md-editor-rt (Markdown rendering)
- lucide-vue-next (icons)
- class-variance-authority + clsx + tailwind-merge (styling utilities)

### Build Output

- `dist/vue-ui.es.js` (ESM) - 449KB
- `dist/vue-ui.umd.js` (UMD) - 298KB
- `dist/style.css` - 60KB
- Complete TypeScript type definitions

### Known Issues

None

### Breaking Changes

None (initial release)
