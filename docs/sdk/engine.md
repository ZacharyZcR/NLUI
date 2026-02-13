# TypeScript Engine

`@nlui/engine` — Full NLUI engine in TypeScript, zero backend dependency. Runs entirely in the browser.

## Install

```bash
npm install @nlui/engine
```

## Usage

```ts
import { createEngine } from "@nlui/engine";

const engine = createEngine({
  llm: {
    apiBase: "https://api.openai.com/v1",
    apiKey: "sk-...",
    model: "gpt-4o",
  },
});

// Load tools from OpenAPI spec
await engine.loadSpec("https://petstore.swagger.io/v2/swagger.json");

// Chat with streaming
for await (const event of engine.chat("List all pets")) {
  if (event.type === "content_delta") {
    process.stdout.write(event.delta);
  }
}
```

## React Integration

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
      <button onClick={() => send("Hello")}>Send</button>
    </div>
  );
}
```
