import type { Message, Tool, ToolCall, Usage, StreamChunk } from '../types.js';
import { parseSSE } from './sse.js';

export interface LLMClientConfig {
  apiBase: string;
  apiKey: string;
  model: string;
}

export class LLMClient {
  private apiBase: string;
  private apiKey: string;
  private model: string;

  constructor(config: LLMClientConfig) {
    this.apiBase = config.apiBase.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  /**
   * Streaming chat with tool call accumulation.
   * Mirrors Go's ChatStreamWithTools — assembles a complete assistant Message
   * from SSE deltas, calling onDelta for each text chunk.
   */
  async chatStreamWithTools(
    messages: Message[],
    tools: Tool[],
    onDelta: ((delta: string) => void) | null,
    signal?: AbortSignal,
  ): Promise<{ message: Message; usage: Usage | null }> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (tools.length > 0) body.tools = tools;

    const resp = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`LLM API error ${resp.status}: ${text}`);
    }

    if (!resp.body) throw new Error('Response body is null');

    // Assemble from stream
    const assembled: Message = { role: 'assistant', content: '' };
    const toolCallMap = new Map<number, ToolCall>();
    let usage: Usage | null = null;

    for await (const chunk of parseSSE(resp.body)) {
      if (chunk.usage) usage = chunk.usage;
      if (!chunk.choices?.length) continue;

      const delta = chunk.choices[0].delta;

      if (delta.content) {
        assembled.content += delta.content;
        onDelta?.(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          let existing = toolCallMap.get(tc.index);
          if (!existing) {
            existing = {
              id: tc.id ?? '',
              type: 'function',
              function: { name: tc.function?.name ?? '', arguments: '' },
            };
            toolCallMap.set(tc.index, existing);
          }
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.function.name = tc.function.name;
          if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
        }
      }
    }

    // Convert map to sorted array
    if (toolCallMap.size > 0) {
      const maxIdx = Math.max(...toolCallMap.keys());
      assembled.tool_calls = [];
      for (let i = 0; i <= maxIdx; i++) {
        const tc = toolCallMap.get(i);
        if (tc) assembled.tool_calls.push(tc);
      }
    }

    return { message: assembled, usage };
  }
}
