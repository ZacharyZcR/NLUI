"""
NLUI Type Definitions
"""

from dataclasses import dataclass
from typing import List, Optional, Any, Dict
from datetime import datetime


@dataclass
class Message:
    """聊天消息"""
    role: str  # "user" | "assistant" | "system"
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None


@dataclass
class Conversation:
    """对话"""
    id: str
    title: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    enabled_sources: Optional[List[str]] = None
    disabled_tools: Optional[List[str]] = None


@dataclass
class ChatEvent:
    """聊天事件"""
    type: str
    data: Dict[str, Any]


@dataclass
class HealthResponse:
    """健康检查响应"""
    status: str
    tools: int


@dataclass
class InfoResponse:
    """服务信息响应"""
    language: str
    tools: int
