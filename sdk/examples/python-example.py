#!/usr/bin/env python3
"""
NLUI Python SDK 示例

展示同步和异步两种使用方式
"""

import asyncio
from nlui import NLUIClient, AsyncNLUIClient


def sync_example():
    """同步客户端示例（适用于脚本和简单应用）"""
    print("=" * 60)
    print("同步客户端示例")
    print("=" * 60)

    # 创建客户端
    client = NLUIClient(base_url="http://localhost:9000")

    # 1. 健康检查
    health = client.health()
    print(f"\n✓ NLUI is healthy, {health.tools} tools available")

    # 2. 获取服务信息
    info = client.info()
    print(f"Language: {info.language}, Tools: {info.tools}")

    # 3. 创建新对话
    conv = client.create_conversation("Python SDK 测试对话")
    print(f"\nCreated conversation: {conv.id}")

    # 4. 发送消息（流式）
    print("\nSending message...")
    print("Assistant: ", end="", flush=True)

    full_text = ""

    def on_event(event):
        nonlocal full_text
        if event.type == "content_delta":
            text = event.data.get("delta", "")
            print(text, end="", flush=True)
            full_text += text
        elif event.type == "tool_call":
            print(f"\n[Tool Call: {event.data['name']}]", flush=True)
        elif event.type == "tool_result":
            print(f"[Tool Result: {event.data['name']}]", flush=True)

    conv_id = client.chat(
        "你好，介绍一下自己",
        conversation_id=conv.id,
        on_event=on_event,
    )
    print(f"\n\n✓ Conversation completed: {conv_id}")

    # 5. 列出所有对话
    conversations = client.list_conversations()
    print(f"\nTotal conversations: {len(conversations)}")
    for c in conversations[:5]:  # 只显示前 5 个
        print(f"  - {c.id}: {c.title} ({len(c.messages)} messages)")

    # 6. 获取对话详情
    full_conv = client.get_conversation(conv.id)
    print(f"\nConversation '{full_conv.title}' has {len(full_conv.messages)} messages")
    for i, msg in enumerate(full_conv.messages):
        preview = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
        print(f"  [{i}] {msg.role}: {preview}")

    # 7. 清理（可选）
    # client.delete_conversation(conv.id)
    # print(f"\nDeleted conversation: {conv.id}")


async def async_example():
    """异步客户端示例（适用于 FastAPI/async 应用）"""
    print("\n" + "=" * 60)
    print("异步客户端示例")
    print("=" * 60)

    # 创建异步客户端
    async with AsyncNLUIClient(base_url="http://localhost:9000") as client:
        # 1. 健康检查
        health = await client.health()
        print(f"\n✓ NLUI is healthy, {health.tools} tools available")

        # 2. 创建对话
        conv = await client.create_conversation("Async Python SDK 测试")
        print(f"Created conversation: {conv.id}")

        # 3. 异步流式对话
        print("\nSending async message...")
        print("Assistant: ", end="", flush=True)

        def on_event(event):
            if event.type == "content_delta":
                print(event.data.get("delta", ""), end="", flush=True)

        conv_id = await client.chat(
            "用一句话介绍 Python 的优势",
            conversation_id=conv.id,
            on_event=on_event,
        )
        print(f"\n\n✓ Completed: {conv_id}")

        # 4. 并发获取多个对话（展示异步优势）
        conversations = await client.list_conversations()
        print(f"\nFetching {min(3, len(conversations))} conversations concurrently...")

        tasks = [
            client.get_conversation(c.id)
            for c in conversations[:3]
        ]
        results = await asyncio.gather(*tasks)

        for conv in results:
            print(f"  - {conv.title}: {len(conv.messages)} messages")


def cli_mode():
    """CLI 模式（交互式对话）"""
    print("\n" + "=" * 60)
    print("CLI 交互模式")
    print("=" * 60)
    print("输入 'exit' 退出\n")

    client = NLUIClient()
    conv_id = None

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit"):
                print("Goodbye!")
                break

            print("Assistant: ", end="", flush=True)

            def on_event(event):
                if event.type == "content_delta":
                    print(event.data.get("delta", ""), end="", flush=True)

            conv_id = client.chat(
                user_input,
                conversation_id=conv_id,
                on_event=on_event,
            )
            print("\n")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}\n")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        # CLI 交互模式
        cli_mode()
    else:
        # 运行所有示例
        sync_example()
        asyncio.run(async_example())

        print("\n" + "=" * 60)
        print("提示：运行 `python python-example.py --cli` 进入交互模式")
        print("=" * 60)
