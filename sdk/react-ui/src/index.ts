// 高层组件
export { ChatInterface } from "./components/chat/ChatInterface";
export type { ChatInterfaceProps } from "./components/chat/ChatInterface";

export { SettingsPanel } from "./components/chat/SettingsPanel";
export type { SettingsPanelProps, SettingsClient } from "./components/chat/SettingsPanel";

// 中层组件
export { MessageList } from "./components/chat/MessageList";
export type { MessageListProps } from "./components/chat/MessageList";

export { InputBox } from "./components/chat/InputBox";
export type { InputBoxProps } from "./components/chat/InputBox";

export { ConversationSidebar } from "./components/chat/ConversationSidebar";
export type { ConversationSidebarProps } from "./components/chat/ConversationSidebar";

// 底层消息组件
export { Message } from "./components/chat/Message";
export type { MessageProps } from "./components/chat/Message";

export { UserMessage } from "./components/chat/UserMessage";
export type { UserMessageProps } from "./components/chat/UserMessage";

export { AssistantMessage } from "./components/chat/AssistantMessage";
export type { AssistantMessageProps } from "./components/chat/AssistantMessage";

export { ToolCallMessage } from "./components/chat/ToolCallMessage";
export type { ToolCallMessageProps } from "./components/chat/ToolCallMessage";

export { ToolResultMessage } from "./components/chat/ToolResultMessage";
export type { ToolResultMessageProps } from "./components/chat/ToolResultMessage";

// 渲染器
export { RichResult } from "./components/renderers/RichResult";
export { DataTable } from "./components/renderers/DataTable";
export { KVCard } from "./components/renderers/KVCard";
export { BadgeList } from "./components/renderers/BadgeList";

// UI基础组件
export { Button } from "./components/ui/Button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/Card";
export { Badge } from "./components/ui/Badge";
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./components/ui/Table";
export { Textarea } from "./components/ui/Textarea";
export { Input } from "./components/ui/Input";

// 主题
export { ThemeProvider, useTheme } from "./components/theme/ThemeProvider";

// 工具函数
export { detectShape } from "./lib/detect-shape";
export { splitRenderBlocks } from "./lib/render-blocks";
export { cn } from "./lib/utils";

// 类型
export type { Message as MessageType, Conversation } from "./lib/types";
export type { DataShape } from "./lib/detect-shape";
export type { RenderHint, Block } from "./lib/render-blocks";
