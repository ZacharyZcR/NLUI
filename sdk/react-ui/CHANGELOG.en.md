# Changelog

## v0.2.0 (2026-02-15)

### Initial Release

Complete React UI component library, extracted from the desktop app with Wails dependencies removed.

### Features

- **Full chat interface** - `<ChatInterface />` all-in-one component
- **Tool call support** - Automatic rendering of `tool_call` and `tool_result` messages
- **Smart JSON rendering** - Auto-detects tables, key-value pairs, lists, and other data structures
- **kelper fence blocks** - Supports `` ```kelper:table `` special markdown blocks
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

- React 18+
- TypeScript 5.6+
- CSS Variables theme system
- md-editor-rt (Markdown rendering)
- lucide-react (icons)
- class-variance-authority + clsx + tailwind-merge (styling utilities)

### Build Output

- `dist/index.js` (CJS) - 48KB
- `dist/index.mjs` (ESM) - 40KB
- `dist/styles.css` - 4KB
- Complete TypeScript type definitions

### Known Issues

None

### Breaking Changes

None (initial release)
