"""
NLUI Extended Client Methods (Phase 1-5)

扩展方法，提供与桌面端完全对等的功能
"""

from typing import Dict, List, Optional, Any
from .client import NLUIClient


class ExtendedNLUIClient(NLUIClient):
    """扩展的 NLUI 客户端，包含所有高级功能"""

    # ============= Phase 1: Targets Management =============

    def add_target(
        self,
        name: str,
        base_url: str = "",
        spec: str = "",
        auth_type: str = "",
        auth_token: str = "",
        description: str = "",
    ) -> Dict[str, Any]:
        """
        动态添加 OpenAPI target

        Args:
            name: Target 名称
            base_url: API 基础 URL
            spec: OpenAPI spec URL 或文件路径
            auth_type: 认证类型（bearer, api_key 等）
            auth_token: 认证 token
            description: 描述

        Returns:
            添加结果，包含工具数量
        """
        resp = self.session.post(
            f"{self.base_url}/api/targets",
            json={
                "name": name,
                "base_url": base_url,
                "spec": spec,
                "auth_type": auth_type,
                "auth_token": auth_token,
                "description": description,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def list_targets(self) -> List[Dict[str, Any]]:
        """列出所有配置的 OpenAPI targets"""
        resp = self.session.get(
            f"{self.base_url}/api/targets",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def remove_target(self, name: str) -> Dict[str, Any]:
        """删除一个 target"""
        resp = self.session.delete(
            f"{self.base_url}/api/targets/{name}",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def probe_target(self, base_url: str) -> Dict[str, Any]:
        """
        探测一个 URL，自动发现 OpenAPI spec

        Args:
            base_url: 要探测的基础 URL

        Returns:
            探测结果，包含是否找到 spec、工具数量等
        """
        resp = self.session.post(
            f"{self.base_url}/api/targets/probe",
            json={"base_url": base_url},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    # ============= Phase 2: Tools Management =============

    def list_tools(self) -> List[Dict[str, Any]]:
        """列出所有可用工具"""
        resp = self.session.get(
            f"{self.base_url}/api/tools",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def list_tool_sources(self) -> List[Dict[str, Any]]:
        """列出所有工具源（OpenAPI / MCP）"""
        resp = self.session.get(
            f"{self.base_url}/api/tools/sources",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def get_conversation_tools(self, conversation_id: str) -> Dict[str, List[str]]:
        """获取对话的工具配置"""
        resp = self.session.get(
            f"{self.base_url}/api/conversations/{conversation_id}/tools",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def update_conversation_tools(
        self,
        conversation_id: str,
        enabled_sources: Optional[List[str]] = None,
        disabled_tools: Optional[List[str]] = None,
    ) -> Dict[str, str]:
        """
        更新对话的工具配置

        Args:
            conversation_id: 对话 ID
            enabled_sources: 启用的工具源列表
            disabled_tools: 禁用的工具列表
        """
        resp = self.session.put(
            f"{self.base_url}/api/conversations/{conversation_id}/tools",
            json={
                "enabled_sources": enabled_sources or [],
                "disabled_tools": disabled_tools or [],
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    # ============= Phase 3: Message Editing & Regeneration =============

    def edit_message(
        self,
        conversation_id: str,
        message_index: int,
        new_content: str,
        on_event: Optional[Any] = None,
    ) -> None:
        """
        编辑消息并从该点重新生成

        Args:
            conversation_id: 对话 ID
            message_index: 消息索引
            new_content: 新的消息内容
            on_event: 事件回调函数
        """
        resp = self.session.put(
            f"{self.base_url}/api/conversations/{conversation_id}/messages/{message_index}",
            json={"content": new_content},
            stream=True,
            timeout=None,
        )
        resp.raise_for_status()

        # 解析 SSE 流
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.strip():
                continue
            if line.startswith("data: "):
                data_str = line[6:].strip()
                try:
                    data = json.loads(data_str) if data_str else {}
                    if "conversation_id" in data:
                        continue
                    event_type = self._infer_event_type(data)
                    if on_event:
                        from .types import ChatEvent
                        on_event(ChatEvent(type=event_type, data=data))
                except:
                    pass

    def regenerate_from(
        self,
        conversation_id: str,
        from_index: int,
        on_event: Optional[Any] = None,
    ) -> None:
        """
        从某个消息索引开始重新生成

        Args:
            conversation_id: 对话 ID
            from_index: 起始消息索引
            on_event: 事件回调函数
        """
        resp = self.session.post(
            f"{self.base_url}/api/conversations/{conversation_id}/regenerate",
            json={"from_index": from_index},
            stream=True,
            timeout=None,
        )
        resp.raise_for_status()

        # 解析 SSE 流
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.strip():
                continue
            if line.startswith("data: "):
                data_str = line[6:].strip()
                try:
                    data = json.loads(data_str) if data_str else {}
                    if "conversation_id" in data:
                        continue
                    event_type = self._infer_event_type(data)
                    if on_event:
                        from .types import ChatEvent
                        on_event(ChatEvent(type=event_type, data=data))
                except:
                    pass

    def delete_message(self, conversation_id: str, message_index: int) -> Dict[str, str]:
        """删除单条消息"""
        resp = self.session.delete(
            f"{self.base_url}/api/conversations/{conversation_id}/messages/{message_index}",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def delete_messages_from(
        self, conversation_id: str, message_index: int
    ) -> Dict[str, str]:
        """删除从某个索引开始的所有消息"""
        resp = self.session.delete(
            f"{self.base_url}/api/conversations/{conversation_id}/messages/{message_index}/from",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    # ============= Phase 4: LLM Configuration =============

    def get_llm_config(self) -> Dict[str, str]:
        """获取当前 LLM 配置"""
        resp = self.session.get(
            f"{self.base_url}/api/config/llm",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def update_llm_config(
        self, api_base: str, api_key: str = "", model: str = ""
    ) -> Dict[str, str]:
        """
        更新 LLM 配置

        Args:
            api_base: LLM API 基础 URL
            api_key: API 密钥
            model: 模型名称
        """
        resp = self.session.put(
            f"{self.base_url}/api/config/llm",
            json={
                "api_base": api_base,
                "api_key": api_key,
                "model": model,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def probe_llm_providers(self) -> List[Dict[str, str]]:
        """探测可用的 LLM 提供商（本地 + 云端）"""
        resp = self.session.get(
            f"{self.base_url}/api/config/llm/providers",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def fetch_models(self, api_base: str, api_key: str = "") -> List[str]:
        """
        获取指定 LLM 提供商的模型列表

        Args:
            api_base: LLM API 基础 URL
            api_key: API 密钥
        """
        resp = self.session.post(
            f"{self.base_url}/api/config/llm/models",
            json={
                "api_base": api_base,
                "api_key": api_key,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    # ============= Phase 5: Proxy Configuration =============

    def get_proxy_config(self) -> Dict[str, str]:
        """获取当前代理配置"""
        resp = self.session.get(
            f"{self.base_url}/api/config/proxy",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def update_proxy_config(self, proxy: str) -> Dict[str, str]:
        """
        更新代理配置

        Args:
            proxy: 代理 URL（如 http://127.0.0.1:7890）
        """
        resp = self.session.put(
            f"{self.base_url}/api/config/proxy",
            json={"proxy": proxy},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def test_proxy(self, proxy: str) -> Dict[str, str]:
        """
        测试代理连接

        Args:
            proxy: 代理 URL

        Returns:
            测试结果
        """
        resp = self.session.post(
            f"{self.base_url}/api/config/proxy/test",
            json={"proxy": proxy},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()


# 导入 json 用于解析
import json
