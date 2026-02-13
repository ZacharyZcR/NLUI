# TypeScript 引擎

`@nlui/engine` — 完整的 NLUI 引擎 TypeScript 实现，零后端依赖，可完全在浏览器中运行。

## 安装

```bash
npm install @nlui/engine
```

## 使用

```ts
import { createEngine } from "@nlui/engine";

const engine = createEngine({
  llm: {
    apiBase: "https://api.openai.com/v1",
    apiKey: "sk-...",
    model: "gpt-4o",
  },
});

// 从 OpenAPI spec 加载工具
await engine.loadSpec("https://petstore.swagger.io/v2/swagger.json");

// 流式对话
for await (const event of engine.chat("列出所有宠物")) {
  if (event.type === "content_delta") {
    process.stdout.write(event.delta);
  }
}
```

## React 集成

```ts
import { useEngine } from "@nlui/engine/react";

function Chat() {
  const { send, messages, loading } = useEngine({
    llm: { apiBase: "...", model: "..." },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <button onClick={() => send("你好")}>发送</button>
    </div>
  );
}
```
