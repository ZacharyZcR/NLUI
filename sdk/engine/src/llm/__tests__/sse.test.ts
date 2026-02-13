import { describe, it, expect } from 'vitest';
import { parseSSE } from '../sse.js';

function makeStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe('parseSSE', () => {
  it('parses content delta chunks', async () => {
    const stream = makeStream(
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n' +
      'data: {"choices":[{"delta":{"content":" world"}}]}\n' +
      'data: [DONE]\n',
    );

    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].choices![0].delta.content).toBe('hello');
    expect(chunks[1].choices![0].delta.content).toBe(' world');
  });

  it('parses tool call deltas', async () => {
    const stream = makeStream(
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"getPet","arguments":""}}]}}]}\n' +
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"id\\":1}"}}]}}]}\n' +
      'data: [DONE]\n',
    );

    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].choices![0].delta.tool_calls![0].id).toBe('call_1');
    expect(chunks[0].choices![0].delta.tool_calls![0].function!.name).toBe('getPet');
  });

  it('captures usage', async () => {
    const stream = makeStream(
      'data: {"choices":[{"delta":{"content":"x"}}]}\n' +
      'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n' +
      'data: [DONE]\n',
    );

    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[1].usage?.total_tokens).toBe(15);
  });

  it('skips non-data lines', async () => {
    const stream = makeStream(
      'event: message\n' +
      ': comment\n' +
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n' +
      '\n' +
      'data: [DONE]\n',
    );

    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
  });

  it('skips malformed JSON', async () => {
    const stream = makeStream(
      'data: not-json\n' +
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n' +
      'data: [DONE]\n',
    );

    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
  });

  it('handles empty stream', async () => {
    const stream = makeStream('');
    const chunks = [];
    for await (const chunk of parseSSE(stream)) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(0);
  });
});
