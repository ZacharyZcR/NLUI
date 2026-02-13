"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { chatStream } from "@/lib/api";
import type { Message } from "@/lib/types";

interface ChatMainProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function ChatMain({ conversationId, onConversationCreated }: ChatMainProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: nextId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      scrollToBottom();

      try {
        await chatStream(text, conversationId, "", (event) => {
          switch (event.type) {
            case "tool_call": {
              const d = event.data as { name: string; arguments: string };
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "tool_call",
                  content: "",
                  toolName: d.name,
                  toolArgs: d.arguments,
                  timestamp: new Date(),
                },
              ]);
              scrollToBottom();
              break;
            }
            case "tool_result": {
              const d = event.data as { name: string; result: string };
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "tool_result",
                  content: d.result,
                  toolName: d.name,
                  timestamp: new Date(),
                },
              ]);
              scrollToBottom();
              break;
            }
            case "content": {
              const d = event.data as { text: string };
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "assistant",
                  content: d.text,
                  timestamp: new Date(),
                },
              ]);
              scrollToBottom();
              break;
            }
            case "done": {
              const d = event.data as { conversation_id?: string };
              if (d.conversation_id && !conversationId) {
                onConversationCreated(d.conversation_id);
              }
              break;
            }
            case "error": {
              const d = event.data as { error?: string };
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "assistant",
                  content: `Error: ${d.error || "unknown error"}`,
                  timestamp: new Date(),
                },
              ]);
              scrollToBottom();
              break;
            }
          }
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `连接失败: ${err instanceof Error ? err.message : "unknown"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [conversationId, onConversationCreated, scrollToBottom]
  );

  return (
    <div className="flex flex-col flex-1 h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-[50vh] text-muted-foreground text-sm">
              开始对话，Kelper 将通过工具操作你的系统
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                <span className="text-sm text-muted-foreground animate-pulse">思考中...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
