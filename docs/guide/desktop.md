# Desktop App

NLUI includes a native desktop application built with [Wails v2](https://wails.io/), featuring a React frontend embedded in a Go binary.

## Prerequisites

- **Go** 1.25+
- **Node.js** 20+
- **Wails CLI** v2

Install Wails:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Development

```bash
cd desktop
wails dev
```

This starts the app in development mode with hot-reload for the frontend.

## Build

```bash
cd desktop
wails build
```

The binary is output to `desktop/build/bin/`.

| Platform | Output |
|---|---|
| Windows | `build/bin/nlui-desktop.exe` |
| macOS | `build/bin/nlui-desktop.app` |
| Linux | `build/bin/nlui-desktop` |

## Architecture

The desktop app is a separate Go module (`desktop/go.mod`) that uses `replace` to reference the main NLUI packages:

```
desktop/
├── main.go              # Wails app bootstrap
├── app.go               # Go backend (bound to frontend)
├── frontend/            # React app (Vite)
│   ├── src/
│   └── dist/            # Embedded in binary via go:embed
├── go.mod               # Separate module
└── build/
```

### Go ↔ Frontend Binding

The `App` struct methods are automatically exposed to the frontend via Wails bindings:

```go
// Go side
func (a *App) Chat(msg string, convID string) { ... }
func (a *App) ListTargets() []map[string]interface{} { ... }
func (a *App) SaveLLMConfig(apiBase, apiKey, model string) error { ... }
```

```ts
// Frontend side (auto-generated)
import { Chat, ListTargets, SaveLLMConfig } from '../wailsjs/go/main/App'
```

### Notes

- **GPU disabled** — `WebviewGpuIsDisabled: true` is set for Windows compatibility on some machines
- **Startup** — Network I/O in `OnStartup` blocks UI rendering. All initialization is async
- **go:embed** — The frontend `dist/` folder is embedded into the binary at compile time, producing a single-file executable
- **Nil slices** — Go nil slices serialize as JSON `null`, not `[]`. All slice fields returned to the frontend must be initialized (e.g., `[]string{}`)
