import { describe, it, expect } from 'vitest';
import { ConversationManager } from '../manager.js';
import { MemoryStorage } from '../storage.js';

function createMgr() {
  return new ConversationManager(new MemoryStorage());
}

describe('ConversationManager', () => {
  it('creates and retrieves a conversation', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', 'you are a bot');

    expect(conv.id).toBeTruthy();
    expect(conv.title).toBe('test');
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].role).toBe('system');

    const got = mgr.get(conv.id);
    expect(got).not.toBeNull();
    expect(got!.id).toBe(conv.id);
  });

  it('creates without system prompt', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    expect(conv.messages).toHaveLength(0);
  });

  it('lists conversations', () => {
    const mgr = createMgr();
    mgr.create('a', '');
    mgr.create('b', '');
    expect(mgr.list()).toHaveLength(2);
  });

  it('deletes a conversation', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    mgr.delete(conv.id);
    expect(mgr.get(conv.id)).toBeNull();
  });

  it('updates messages', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    mgr.updateMessages(conv.id, [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
    const got = mgr.get(conv.id)!;
    expect(got.messages).toHaveLength(2);
  });

  it('edits a message and truncates', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', 'sys');
    mgr.updateMessages(conv.id, [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'old' },
      { role: 'assistant', content: 'reply' },
    ]);

    mgr.editMessage(conv.id, 1, 'new');
    const got = mgr.get(conv.id)!;
    expect(got.messages).toHaveLength(2);
    expect(got.messages[1].content).toBe('new');
  });

  it('deletes a single message', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    mgr.updateMessages(conv.id, [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]);

    mgr.deleteMessage(conv.id, 1);
    const got = mgr.get(conv.id)!;
    expect(got.messages).toHaveLength(2);
    expect(got.messages[1].content).toBe('c');
  });

  it('deletes messages from index', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    mgr.updateMessages(conv.id, [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]);

    mgr.deleteMessagesFrom(conv.id, 1);
    const got = mgr.get(conv.id)!;
    expect(got.messages).toHaveLength(1);
  });

  it('updates tool config', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    mgr.updateToolConfig(conv.id, ['github'], ['delete_repo']);

    const got = mgr.get(conv.id)!;
    expect(got.enabledSources).toEqual(['github']);
    expect(got.disabledTools).toEqual(['delete_repo']);
  });

  it('inherits tool config from latest conversation', () => {
    const mgr = createMgr();
    const conv1 = mgr.create('first', '');
    mgr.updateToolConfig(conv1.id, ['github'], ['delete_repo']);

    const conv2 = mgr.create('second', '');
    expect(conv2.enabledSources).toEqual(['github']);
  });

  it('throws on edit with invalid index', () => {
    const mgr = createMgr();
    const conv = mgr.create('test', '');
    expect(() => mgr.editMessage(conv.id, 5, 'x')).toThrow();
  });

  it('throws on edit with missing conversation', () => {
    const mgr = createMgr();
    expect(() => mgr.editMessage('nonexistent', 0, 'x')).toThrow();
  });

  it('updates title', () => {
    const mgr = createMgr();
    const conv = mgr.create('old', '');
    mgr.updateTitle(conv.id, 'new');
    expect(mgr.get(conv.id)!.title).toBe('new');
  });
});
