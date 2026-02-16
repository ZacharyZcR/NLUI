# 桌面应用

NLUI 包含一个基于 [Wails v2](https://wails.io/) 的原生桌面应用，使用 React 前端嵌入 Go 二进制中。

## 环境要求

- **Go** 1.25+
- **Node.js** 20+
- **Wails CLI** v2

安装 Wails：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## 开发

```bash
cd desktop
wails dev
```

以开发模式启动应用，前端支持热重载。

## 构建

```bash
cd desktop
wails build
```

产物输出到 `desktop/build/bin/`。

| 平台 | 输出 |
|---|---|
| Windows | `build/bin/nlui-desktop.exe` |
| macOS | `build/bin/nlui-desktop.app` |
| Linux | `build/bin/nlui-desktop` |

## 架构

桌面应用是一个独立的 Go module（`desktop/go.mod`），通过 `replace` 引用主 NLUI 包：

```
desktop/
├── main.go              # Wails 应用启动
├── app.go               # Go 后端（绑定到前端）
├── frontend/            # React 应用 (Vite)
│   ├── src/
│   └── dist/            # 通过 go:embed 嵌入二进制
├── go.mod               # 独立 module
└── build/
```

### Go ↔ 前端绑定

`App` 结构体的方法通过 Wails 绑定自动暴露给前端：

```go
// Go 侧
func (a *App) Chat(msg string, convID string) { ... }
func (a *App) ListTargets() []map[string]interface{} { ... }
func (a *App) SaveLLMConfig(apiBase, apiKey, model string) error { ... }
```

```ts
// 前端侧（自动生成）
import { Chat, ListTargets, SaveLLMConfig } from '../wailsjs/go/main/App'
```

### 注意事项

- **GPU 禁用** — 某些 Windows 机器上需要设置 `WebviewGpuIsDisabled: true`
- **启动** — `OnStartup` 中的网络 I/O 会阻塞 UI 渲染，所有初始化使用异步
- **go:embed** — 前端 `dist/` 目录在编译时嵌入二进制，产出单文件可执行程序
- **Nil slice** — Go nil slice 序列化为 JSON `null` 而非 `[]`，所有返回前端的 slice 字段必须初始化（如 `[]string{}`）
