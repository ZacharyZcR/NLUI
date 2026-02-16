# SDK Overview

## Client SDKs

| Language | Package | Install |
|---|---|---|
| Go | `sdk/go` | `go get github.com/ZacharyZcR/NLUI/sdk/go` |
| TypeScript | `@nlui/client` | `npm install @nlui/client` |
| Python | `nlui` | `pip install nlui` |
| Java | `nlui-sdk` | Maven dependency |
| Rust | `nlui` | `cargo add nlui` |

## Framework Integrations

| Framework | Package | Description |
|---|---|---|
| React | `@nlui/react` | Hooks: `useNLUI()` |
| Vue 3 | `@nlui/vue` | Composables: `useNLUI()` |
| Web Components | `@nlui/components` | Framework-agnostic `<nlui-chat>` |
| React UI | `@nlui/react-ui` | Drop-in chat component |
| Vue UI | `@nlui/vue-ui` | Drop-in chat component |

## Feature Matrix

| Feature | HTTP Server | Desktop | SDK |
|---|:---:|:---:|:---:|
| Streaming chat (SSE) | ✓ | ✓ | ✓ |
| OpenAPI auto-discovery | ✓ | ✓ | — |
| Dangerous tool confirmation | ✓ | ✓ | ✓ |
| Stop generation | ✓ | ✓ | ✓ |
| Spec file upload | ✓ | ✓ | ✓ |
| Conversation management | ✓ | ✓ | ✓ |
| Per-conversation tool filter | ✓ | ✓ | ✓ |
| Message edit & regenerate | ✓ | ✓ | ✓ |
| MCP server / client | ✓ | ✓ | — |
| Multi-language prompts | ✓ | ✓ | — |
