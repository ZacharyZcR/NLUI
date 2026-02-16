import { describe, it, expect } from 'vitest';
import { truncateMessages } from '../truncate.js';
import type { Message } from '../../types.js';

function msg(role: Message['role'], content: string, toolCalls?: Message['tool_calls']): Message {
  return { role, content, ...(toolCalls ? { tool_calls: toolCalls } : {}) };
}

describe('truncateMessages', () => {
  it('returns all messages when maxTokens is 0', () => {
    const msgs = [msg('system', 'x'), msg('user', 'x'), msg('assistant', 'x')];
    expect(truncateMessages(msgs, 0)).toHaveLength(3);
  });

  it('returns all messages when empty', () => {
    expect(truncateMessages([], 100)).toHaveLength(0);
  });

  it('keeps system message when budget is tight', () => {
    const msgs = [
      msg('system', 'system prompt here'),
      msg('user', 'this is a long user message with lots of text'),
      msg('assistant', 'this is a long assistant reply with lots of text'),
      msg('user', 'another long user message with content'),
      msg('assistant', 'another long assistant reply text'),
    ];
    const result = truncateMessages(msgs, 5);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('system');
  });

  it('preserves most recent messages', () => {
    const msgs = [
      msg('system', 's'),
      msg('user', 'old message that is quite long enough to eat budget'),
      msg('assistant', 'old reply that is also quite long to eat budget'),
      msg('user', 'new'),
      msg('assistant', 'new'),
    ];
    const result = truncateMessages(msgs, 20);
    expect(result[0].role).toBe('system');
    expect(result[result.length - 1].content).toBe('new');
  });

  it('keeps atomic blocks together', () => {
    const msgs = [
      msg('system', 's'),
      msg('user', 'hi'),
      msg('assistant', '', [{ id: '1', type: 'function', function: { name: 'f', arguments: '{}' } }]),
      msg('tool', 'result'),
      msg('user', 'ok'),
    ];
    const result = truncateMessages(msgs, 1000);
    expect(result).toHaveLength(5);
  });

  it('does not split atomic block', () => {
    const msgs = [
      msg('system', 's'),
      msg('assistant', '', [{ id: '1', type: 'function', function: { name: 'fn', arguments: '{"a":"b"}' } }]),
      msg('tool', 'this is a very long tool result that takes up significant budget space'),
      msg('user', 'x'),
    ];
    // Budget enough for user but not atomic block
    const result = truncateMessages(msgs, 5);
    const roles = result.map(m => m.role);
    expect(roles).toContain('system');
    expect(roles).not.toContain('tool');
  });

  it('works without system message', () => {
    const msgs = [
      msg('user', 'hi'),
      msg('assistant', 'hello'),
    ];
    const result = truncateMessages(msgs, 1000);
    expect(result).toHaveLength(2);
  });
});
