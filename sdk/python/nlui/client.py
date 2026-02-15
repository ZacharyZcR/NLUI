"""
NLUI Synchronous Client (基于 requests)
"""

import json
from typing import Optional, Callable, Iterator
import requests
from .types import (
    Conversation,
    Message,
    ChatEvent,
    HealthResponse,
    InfoResponse,
)


class NLUIClient:
    """NLUI 同步客户端（适用于脚本和简单应用）"""

    def __init__(
        self,
        base_url: str = "http://localhost:9000",
        api_key: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        初始化客户端

        Args:
            base_url: NLUI 服务器地址
            api_key: API 密钥（可选）
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()

        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"

    def health(self) -> HealthResponse:
        """健康检查"""
        resp = self.session.get(
            f"{self.base_url}/api/health",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return HealthResponse(status=data["status"], tools=data["tools"])

    def info(self) -> InfoResponse:
        """获取服务信息"""
        resp = self.session.get(
            f"{self.base_url}/api/info",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return InfoResponse(language=data["language"], tools=data["tools"])

    def chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        on_event: Optional[Callable[[ChatEvent], None]] = None,
        stream: bool = True,
    ) -> Optional[str]:
        """
        发送聊天消息

        Args:
            message: 用户消息
            conversation_id: 对话 ID（可选）
            on_event: 事件回调函数
            stream: 是否使用流式模式

        Returns:
            对话 ID（如果成功）
        """
        payload = {
            "message": message,
            "conversation_id": conversation_id or "",
        }

        resp = self.session.post(
            f"{self.base_url}/api/chat",
            json=payload,
            stream=stream,
            timeout=None if stream else self.timeout,
        )
        resp.raise_for_status()

        if not stream:
            return None

        # 解析 SSE 流
        conv_id = None
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.strip():
                continue

            if line.startswith("event: "):
                continue

            if line.startswith("data: "):
                data_str = line[6:].strip()
                try:
                    data = json.loads(data_str)

                    # 检查是否是 done 事件
                    if "conversation_id" in data:
                        conv_id = data["conversation_id"]
                        continue

                    # 推断事件类型
                    event_type = self._infer_event_type(data)
                    if on_event:
                        on_event(ChatEvent(type=event_type, data=data))

                except json.JSONDecodeError:
                    continue

        return conv_id

    def list_conversations(self) -> list[Conversation]:
        """列出所有对话"""
        resp = self.session.get(
            f"{self.base_url}/api/conversations",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()

        conversations = []
        for item in data:
            messages = [Message(**msg) for msg in item.get("messages", [])]
            conversations.append(
                Conversation(
                    id=item["id"],
                    title=item["title"],
                    messages=messages,
                    created_at=item["created_at"],
                    updated_at=item["updated_at"],
                    enabled_sources=item.get("enabled_sources"),
                    disabled_tools=item.get("disabled_tools"),
                )
            )
        return conversations

    def create_conversation(self, title: str) -> Conversation:
        """创建新对话"""
        resp = self.session.post(
            f"{self.base_url}/api/conversations",
            json={"title": title},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()

        messages = [Message(**msg) for msg in data.get("messages", [])]
        return Conversation(
            id=data["id"],
            title=data["title"],
            messages=messages,
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )

    def get_conversation(self, conversation_id: str) -> Conversation:
        """获取对话详情"""
        resp = self.session.get(
            f"{self.base_url}/api/conversations/{conversation_id}",
            timeout=self.timeout,
        )
        if resp.status_code == 404:
            raise ValueError(f"Conversation {conversation_id} not found")
        resp.raise_for_status()
        data = resp.json()

        messages = [Message(**msg) for msg in data.get("messages", [])]
        return Conversation(
            id=data["id"],
            title=data["title"],
            messages=messages,
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )

    def delete_conversation(self, conversation_id: str) -> None:
        """删除对话"""
        resp = self.session.delete(
            f"{self.base_url}/api/conversations/{conversation_id}",
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 204):
            resp.raise_for_status()

    def _infer_event_type(self, data: dict) -> str:
        """推断事件类型"""
        if "error" in data:
            return "error"
        if "delta" in data:
            return "content_delta"
        if "text" in data:
            return "content"
        if "name" in data and "arguments" in data:
            return "tool_call"
        if "name" in data and "result" in data:
            return "tool_result"
        if "total_tokens" in data:
            return "usage"
        return "unknown"

    def close(self):
        """关闭客户端"""
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
