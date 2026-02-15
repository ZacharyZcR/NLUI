/**
 * NLUI React Example
 *
 * 展示如何在 React 应用中使用 @nlui/react hooks
 */

import React from 'react';
import { useNLUI, useChat, useConversations } from '@nlui/react';

function App() {
  const client = useNLUI({
    baseURL: 'http://localhost:9000',
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>NLUI React Example</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <ConversationList client={client} />
        <ChatBox client={client} />
      </div>
    </div>
  );
}

function ConversationList({ client }: { client: any }) {
  const { conversations, isLoading, create, deleteConv } = useConversations(client);
  const [newTitle, setNewTitle] = React.useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await create(newTitle);
    setNewTitle('');
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
      <h2>对话列表</h2>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新对话标题"
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <button onClick={handleCreate} style={{ width: '100%', padding: '8px' }}>
          创建对话
        </button>
      </div>

      {isLoading ? (
        <p>加载中...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {conversations.map((conv) => (
            <li
              key={conv.id}
              style={{
                padding: '10px',
                marginBottom: '5px',
                background: '#f5f5f5',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{conv.title}</span>
              <button
                onClick={() => deleteConv(conv.id)}
                style={{ background: '#ff3b30', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatBox({ client }: { client: any }) {
  const { messages, isLoading, send, conversationId } = useChat(client);
  const [input, setInput] = React.useState('');

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput('');
    await send(msg);
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
      <h2>聊天</h2>
      {conversationId && <p style={{ fontSize: '12px', color: '#888' }}>对话 ID: {conversationId}</p>}

      <div
        style={{
          height: '400px',
          overflowY: 'auto',
          marginBottom: '15px',
          padding: '10px',
          background: '#f9f9f9',
          borderRadius: '6px',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '10px',
              padding: '10px',
              borderRadius: '6px',
              background: msg.role === 'user' ? '#007aff' : 'white',
              color: msg.role === 'user' ? 'white' : 'black',
              textAlign: msg.role === 'user' ? 'right' : 'left',
              border: msg.role === 'assistant' ? '1px solid #ddd' : 'none',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && <p style={{ textAlign: 'center', color: '#888' }}>思考中...</p>}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          disabled={isLoading}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '10px 20px',
            background: isLoading ? '#ccc' : '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default App;
