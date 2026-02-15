# NLUI Python SDK

[![PyPI version](https://badge.fury.io/py/nlui.svg)](https://badge.fury.io/py/nlui)
[![Python Versions](https://img.shields.io/pypi/pyversions/nlui.svg)](https://pypi.org/project/nlui/)

NLUI Python SDK - 自然语言用户界面的官方 Python 客户端。

## ✨ 特性

- ✅ **同步 & 异步** - 同时支持 `requests` 和 `httpx`
- ✅ **类型提示** - 完整的类型注解支持
- ✅ **流式响应** - SSE 流式对话支持
- ✅ **Pythonic API** - 符合 Python 习惯的 API 设计
- ✅ **零配置** - 开箱即用

## 📦 安装

```bash
pip install nlui
```

## 🚀 快速开始

### 同步客户端（简单脚本）

```python
from nlui import NLUIClient

# 创建客户端
client = NLUIClient(base_url="http://localhost:9000")

# 健康检查
health = client.health()
print(f"✓ NLUI is healthy, {health.tools} tools available")

# 发送消息（流式）
def on_event(event):
    if event.type == "content_delta":
        print(event.data["delta"], end="", flush=True)

conv_id = client.chat("你好，介绍一下自己", on_event=on_event)
print(f"\n对话 ID: {conv_id}")

# 对话管理
conversations = client.list_conversations()
for conv in conversations:
    print(f"- {conv.title} ({len(conv.messages)} 消息)")
```

### 异步客户端（FastAPI/async 应用）

```python
import asyncio
from nlui import AsyncNLUIClient

async def main():
    # 创建异步客户端
    async with AsyncNLUIClient(base_url="http://localhost:9000") as client:
        # 健康检查
        health = await client.health()
        print(f"✓ {health.tools} tools available")

        # 异步流式对话
        def on_event(event):
            if event.type == "content_delta":
                print(event.data["delta"], end="", flush=True)

        conv_id = await client.chat("你好", on_event=on_event)
        print(f"\n对话 ID: {conv_id}")

asyncio.run(main())
```

## 📖 API 文档

### `NLUIClient` / `AsyncNLUIClient`

#### 初始化

```python
client = NLUIClient(
    base_url="http://localhost:9000",  # NLUI 服务器地址
    api_key="your-api-key",            # 可选：API 密钥
    timeout=30,                         # 可选：请求超时（秒）
)
```

#### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `health()` | 健康检查 | `HealthResponse` |
| `info()` | 获取服务信息 | `InfoResponse` |
| `chat(message, conversation_id, on_event)` | 发送消息 | `str` (对话 ID) |
| `list_conversations()` | 列出所有对话 | `List[Conversation]` |
| `create_conversation(title)` | 创建新对话 | `Conversation` |
| `get_conversation(id)` | 获取对话详情 | `Conversation` |
| `delete_conversation(id)` | 删除对话 | `None` |

### 类型定义

```python
@dataclass
class Message:
    role: str              # "user" | "assistant" | "system"
    content: str
    tool_calls: Optional[List[Dict]]

@dataclass
class Conversation:
    id: str
    title: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime

@dataclass
class ChatEvent:
    type: str              # 事件类型
    data: Dict[str, Any]   # 事件数据
```

### 事件类型

| 类型 | 说明 | 数据格式 |
|------|------|----------|
| `content_delta` | 流式文本增量 | `{"delta": "..."}` |
| `content` | 完整文本块 | `{"text": "..."}` |
| `tool_call` | 工具调用 | `{"name": "...", "arguments": "{}"}` |
| `tool_result` | 工具结果 | `{"name": "...", "result": "..."}` |
| `usage` | Token 统计 | `{"total_tokens": 123}` |
| `error` | 错误 | `{"error": "..."}` |

## 🎯 使用场景

### 1. Jupyter Notebook 集成

```python
from nlui import NLUIClient

client = NLUIClient()

# 简单对话
result = []
client.chat("分析这个数据集", on_event=lambda e: result.append(e.data))
```

### 2. FastAPI 后端集成

```python
from fastapi import FastAPI
from nlui import AsyncNLUIClient

app = FastAPI()
nlui = AsyncNLUIClient()

@app.post("/chat")
async def chat(message: str):
    events = []
    conv_id = await nlui.chat(message, on_event=lambda e: events.append(e))
    return {"conversation_id": conv_id, "events": events}
```

### 3. Streamlit 应用

```python
import streamlit as st
from nlui import NLUIClient

st.title("NLUI Chat")
client = NLUIClient()

user_input = st.text_input("你的消息：")
if st.button("发送"):
    with st.spinner("思考中..."):
        response = st.empty()
        text = ""

        def on_event(event):
            nonlocal text
            if event.type == "content_delta":
                text += event.data["delta"]
                response.markdown(text)

        client.chat(user_input, on_event=on_event)
```

### 4. CLI 工具

```python
#!/usr/bin/env python3
import sys
from nlui import NLUIClient

def main():
    client = NLUIClient()
    message = " ".join(sys.argv[1:])

    print("Assistant: ", end="", flush=True)
    client.chat(message, on_event=lambda e: (
        print(e.data["delta"], end="", flush=True)
        if e.type == "content_delta" else None
    ))
    print()

if __name__ == "__main__":
    main()
```

使用：
```bash
chmod +x nlui_cli.py
./nlui_cli.py "你好，介绍一下自己"
```

## 🧪 开发

```bash
# 克隆仓库
git clone https://github.com/ZacharyZcR/NLUI.git
cd NLUI/sdk/python

# 安装开发依赖
pip install -e ".[dev]"

# 运行测试
pytest

# 代码格式化
black nlui/
ruff check nlui/
```

## 📝 License

MIT License - 详见 [LICENSE](../../LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

仓库地址：https://github.com/ZacharyZcR/NLUI
