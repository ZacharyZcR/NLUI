import { useEffect, useRef } from "react";
import { Message, type MessageProps } from "./Message";
import type { Message as MessageType } from "@/lib/types";

export interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  onRetry?: () => void;
  onEdit?: (index: number, newContent: string) => void;
  onDelete?: (index: number) => void;
}

export function MessageList({
  messages,
  isLoading,
  onRetry,
  onEdit,
  onDelete,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [messages]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Start a conversation by typing a message below
          </div>
        )}
        {messages.map((msg, index) => (
          <Message
            key={msg.id}
            message={msg}
            isLast={index === messages.length - 1}
            onEdit={onEdit ? (newContent) => onEdit(index, newContent) : undefined}
            onDelete={onDelete ? () => onDelete(index) : undefined}
            onRetry={index === messages.length - 1 && msg.role === "assistant" ? onRetry : undefined}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
