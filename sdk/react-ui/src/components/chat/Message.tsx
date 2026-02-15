import type { Message } from "@/lib/types";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ToolCallMessage } from "./ToolCallMessage";
import { ToolResultMessage } from "./ToolResultMessage";

export interface MessageProps {
  message: Message;
  isLast?: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

export function Message({ message, isLast, onEdit, onDelete, onRetry }: MessageProps) {
  if (message.role === "user") {
    return <UserMessage content={message.content} onEdit={onEdit} onDelete={onDelete} />;
  }

  if (message.role === "tool_call") {
    return <ToolCallMessage name={message.toolName} args={message.toolArgs} />;
  }

  if (message.role === "tool_result") {
    return <ToolResultMessage name={message.toolName} content={message.content} />;
  }

  return <AssistantMessage content={message.content} isLast={isLast} onRetry={onRetry} onDelete={onDelete} />;
}
