# SDK 概览

## 客户端 SDK

| 语言 | 包名 | 安装 |
|---|---|---|
| Go | `sdk/go` | `go get github.com/ZacharyZcR/NLUI/sdk/go` |
| TypeScript | `@nlui/client` | `npm install @nlui/client` |
| Python | `nlui` | `pip install nlui` |
| Java | `nlui-sdk` | Maven 依赖 |
| Rust | `nlui` | `cargo add nlui` |

## 框架集成

| 框架 | 包名 | 说明 |
|---|---|---|
| React | `@nlui/react` | Hooks: `useNLUI()` |
| Vue 3 | `@nlui/vue` | Composables: `useNLUI()` |
| Web Components | `@nlui/components` | 框架无关 `<nlui-chat>` |
| React UI | `@nlui/react-ui` | 开箱即用的聊天组件 |
| Vue UI | `@nlui/vue-ui` | 开箱即用的聊天组件 |

## 功能矩阵

| 功能 | HTTP 服务 | 桌面端 | SDK |
|---|:---:|:---:|:---:|
| 流式对话 (SSE) | ✓ | ✓ | ✓ |
| OpenAPI 自动发现 | ✓ | ✓ | — |
| 危险操作确认 | ✓ | ✓ | ✓ |
| 停止生成 | ✓ | ✓ | ✓ |
| Spec 文件上传 | ✓ | ✓ | ✓ |
| 会话管理 | ✓ | ✓ | ✓ |
| 按会话工具过滤 | ✓ | ✓ | ✓ |
| 消息编辑与重新生成 | ✓ | ✓ | ✓ |
| MCP 服务端 / 客户端 | ✓ | ✓ | — |
| 多语言提示词 | ✓ | ✓ | — |
