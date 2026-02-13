"""
NLUI Python SDK

纯 Python 实现的 NLUI 客户端，支持同步和异步两种模式。
"""

from .client import NLUIClient
from .async_client import AsyncNLUIClient
from .extended_client import ExtendedNLUIClient
from .types import (
    Conversation,
    Message,
    ChatEvent,
    HealthResponse,
    InfoResponse,
)

__version__ = "0.2.0"
__all__ = [
    "NLUIClient",
    "AsyncNLUIClient",
    "ExtendedNLUIClient",
    "Conversation",
    "Message",
    "ChatEvent",
    "HealthResponse",
    "InfoResponse",
]

# 默认使用扩展客户端
NLUIClient = ExtendedNLUIClient
