# Changelog

## v0.1.0 (2026-02-16)

### Initial Release

Complete Web Components UI library, framework-agnostic, built on Lit.

### Features

- **Full chat interface** - `<nlui-chat-interface>` all-in-one component
- **Tool call support** - Automatic rendering of `tool_call` and `tool_result` messages
- **Smart JSON rendering** - Auto-detects tables, key-value pairs, lists, and other data structures
- **nlui fence blocks** - Supports `` ```nlui:table `` special markdown blocks
- **Streaming output** - SSE streaming support
- **Error handling** - Automatic error message display
- **Theme system** - light/dark mode toggle
- **Conversation management** - Sidebar conversation list
- **Framework-agnostic** - Works in any framework (React, Vue, vanilla HTML)

### Components

**High-level**
- `<nlui-chat-interface>` - Complete chat interface

**Mid-level**
- `<nlui-message-list>` - Message list
- `<nlui-input-box>` - Input box
- `<nlui-conversation-sidebar>` - Conversation sidebar

**Low-level**
- `<nlui-message>` - Message router
- `<nlui-user-message>`, `<nlui-assistant-message>`, `<nlui-tool-call-message>`, `<nlui-tool-result-message>`

**Renderers**
- `<nlui-rich-result>` - Smart JSON rendering entry point
- `<nlui-data-table>` - Table rendering
- `<nlui-kv-card>` - Key-value pair rendering
- `<nlui-badge-list>` - Tag list rendering

**Base UI components**
- `<nlui-button>`, `<nlui-card>`, `<nlui-badge>`, `<nlui-table>`, `<nlui-textarea>`, `<nlui-input>`

### Tech Stack

- Lit 3.3+ (Web Components)
- TypeScript 5.6+
- Light DOM mode (no Shadow DOM, supports global styles)
- md-editor-rt (Markdown rendering)
- class-variance-authority + clsx + tailwind-merge (styling utilities)

### Build Output

- `dist/nlui-components.js` (ESM) - 168KB
- `dist/nlui-components.css` - 69B
- Complete TypeScript type definitions

### Known Issues

None

### Breaking Changes

None (initial release)
