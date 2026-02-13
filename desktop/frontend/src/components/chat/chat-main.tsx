import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useI18n } from "@/lib/i18n";
import { Chat, ConfirmTool } from "../../../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";
import type { Message } from "@/lib/types";

interface ChatMainProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

interface PendingConfirm {
  name: string;
  arguments: string;
}

export function ChatMain({ conversationId, onConversationCreated }: ChatMainProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef(conversationId);

  useEffect(() => {
    convIdRef.current = conversationId;
    setMessages([]);
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    const streamIdRef = { current: "" };

    EventsOn("chat-event", (event: { type: string; data: Record<string, unknown> }) => {
      switch (event.type) {
        case "content_delta": {
          const d = event.data as { delta: string };
          if (!streamIdRef.current) {
            streamIdRef.current = nextId();
            setMessages((prev) => [
              ...prev,
              {
                id: streamIdRef.current,
                role: "assistant",
                content: d.delta,
                timestamp: new Date(),
              },
            ]);
          } else {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.id === streamIdRef.current) {
                return [...prev.slice(0, -1), { ...last, content: last.content + d.delta }];
              }
              return prev;
            });
          }
          scrollToBottom();
          break;
        }
        case "tool_call": {
          streamIdRef.current = "";
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
          // Final content event (full text) — if we already streamed, skip adding duplicate
          streamIdRef.current = "";
          scrollToBottom();
          break;
        }
        case "done": {
          streamIdRef.current = "";
          const d = event.data as { conversation_id?: string };
          if (d.conversation_id && !convIdRef.current) {
            onConversationCreated(d.conversation_id);
          }
          setLoading(false);
          scrollToBottom();
          break;
        }
        case "error": {
          streamIdRef.current = "";
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
          setLoading(false);
          scrollToBottom();
          break;
        }
      }
    });

    EventsOn("tool-confirm", (data: { name: string; arguments: string }) => {
      setPendingConfirm(data);
    });

    return () => {
      EventsOff("chat-event");
      EventsOff("tool-confirm");
    };
  }, [onConversationCreated, scrollToBottom]);

  const handleConfirm = useCallback((approved: boolean) => {
    setPendingConfirm(null);
    ConfirmTool(approved);
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
        await Chat(text, conversationId || "");
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `${t("chat.error")}: ${err instanceof Error ? err.message : "unknown"}`,
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
      }
    },
    [conversationId, scrollToBottom, t]
  );

  return (
    <div className="flex flex-col flex-1 h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-[50vh] text-muted-foreground text-sm">
              {t("chat.empty")}
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {pendingConfirm && (
            <Card className="border-destructive/50 bg-destructive/5 px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-destructive text-sm">&#9888;</span>
                <span className="text-sm font-medium">{t("confirm.title")}</span>
              </div>
              <div className="mb-3">
                <Badge variant="outline" className="text-xs font-mono border-destructive/30 text-destructive">
                  {pendingConfirm.name}
                </Badge>
                <pre className="mt-2 text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
                  {formatJSON(pendingConfirm.arguments)}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => handleConfirm(true)}>
                  {t("confirm.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleConfirm(false)}>
                  {t("confirm.reject")}
                </Button>
              </div>
            </Card>
          )}
          {loading && !pendingConfirm && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                <span className="text-sm text-muted-foreground animate-pulse">{t("chat.thinking")}</span>
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

function formatJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
