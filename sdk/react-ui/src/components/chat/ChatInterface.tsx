import { useState, useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { InputBox } from "./InputBox";
import { ConversationSidebar } from "./ConversationSidebar";
import type { Message } from "@/lib/types";
import type { UseConversationsReturn } from "@nlui/react";
import type NLUIClient from "@nlui/client";

export interface ChatInterfaceProps {
  client: NLUIClient;
  conversationId?: string | null;
  conversations?: UseConversationsReturn;
  showSidebar?: boolean;
  theme?: "light" | "dark";
  onConversationChange?: (id: string) => void;
}

export function ChatInterface({
  client,
  conversationId,
  conversations,
  showSidebar = false,
  theme = "light",
  onConversationChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const msgCounterRef = useRef(0);

  const nextId = () => `msg-${++msgCounterRef.current}-${Date.now()}`;

  // 从后端加载消息
  useEffect(() => {
    if (conversationId) {
      client.getConversation(conversationId).then((conv) => {
        setMessages(
          (conv.messages || []).map((m: any, idx: number) => ({
            id: `${conversationId}-${idx}`,
            role: m.role,
            content: m.content || "",
            toolName: m.tool_name,
            toolArgs: m.tool_arguments,
            timestamp: new Date(),
          }))
        );
      });
    } else {
      setMessages([]);
    }
  }, [conversationId, client]);

  const handleSend = async (text: string) => {
    if (isLoading) return;

    // 添加用户消息
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);
    setIsLoading(true);
    setError(null);

    let streamId = "";
    let assistantContent = "";

    try {
      await client.chat(text, {
        conversationId: conversationId || undefined,
        onEvent: (event: any) => {
          if (event.type === "content_delta") {
            const delta = event.data.delta;
            if (!streamId) {
              streamId = nextId();
              assistantContent = delta;
              setMessages((prev) => [
                ...prev,
                {
                  id: streamId,
                  role: "assistant",
                  content: assistantContent,
                  timestamp: new Date(),
                },
              ]);
            } else {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.id === streamId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: assistantContent },
                  ];
                }
                return prev;
              });
            }
          } else if (event.type === "tool_call") {
            streamId = "";
            const { name, arguments: args } = event.data;
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "tool_call",
                content: "",
                toolName: name,
                toolArgs: args,
                timestamp: new Date(),
              },
            ]);
          } else if (event.type === "tool_result") {
            const { name, result } = event.data;
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "tool_result",
                content: result,
                toolName: name,
                timestamp: new Date(),
              },
            ]);
          } else if (event.type === "content") {
            streamId = "";
          }
        },
        onDone: (convId: string) => {
          if (!conversationId && convId) {
            onConversationChange?.(convId);
          }
          setIsLoading(false);
        },
        onError: (err: Error) => {
          setError(err);
          setIsLoading(false);
        },
      });
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    const lastUserMsg = messages.findLast((m) => m.role === "user");
    if (lastUserMsg) {
      await handleSend(lastUserMsg.content);
    }
  };

  return (
    <div className={`flex h-full ${theme}`}>
      {showSidebar && conversations && (
        <ConversationSidebar
          conversations={conversations.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            createdAt: new Date(c.created_at),
            updatedAt: new Date(c.updated_at),
          }))}
          activeId={conversationId || null}
          onSelect={(id) => {
            onConversationChange?.(id);
          }}
          onNew={() => {
            onConversationChange?.("");
          }}
          onDelete={async (id) => {
            await conversations.deleteConv(id);
          }}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0 bg-background text-foreground">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20">
            Error: {error.message}
          </div>
        )}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onRetry={handleRetry}
        />
        <InputBox onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
