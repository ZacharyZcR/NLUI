import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, X, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useI18n } from "@/lib/i18n";
import { Chat, ConfirmTool, GetConversationMessages, StopChat, EditMessage, DeleteMessage, RegenerateFrom } from "../../../wailsjs/go/main/App";
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

interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export function ChatMain({ conversationId, onConversationCreated }: ChatMainProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef(conversationId);

  useEffect(() => {
    convIdRef.current = conversationId;
    if (conversationId) {
      const loadId = conversationId;
      GetConversationMessages(loadId).then((msgs) => {
        if (convIdRef.current !== loadId) return; // stale
        setMessages(
          (msgs || []).map((m: { id: string; role: string; content: string; tool_name?: string; tool_args?: string }) => ({
            id: m.id,
            role: m.role as Message["role"],
            content: m.content || "",
            toolName: m.tool_name,
            toolArgs: m.tool_args,
            timestamp: new Date(),
          }))
        );
      });
    } else {
      setMessages([]);
    }
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
              { id: streamIdRef.current, role: "assistant", content: d.delta, timestamp: new Date() },
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
            { id: nextId(), role: "tool_call", content: "", toolName: d.name, toolArgs: d.arguments, timestamp: new Date() },
          ]);
          scrollToBottom();
          break;
        }
        case "tool_result": {
          const d = event.data as { name: string; result: string };
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "tool_result", content: d.result, toolName: d.name, timestamp: new Date() },
          ]);
          scrollToBottom();
          break;
        }
        case "content": {
          streamIdRef.current = "";
          scrollToBottom();
          break;
        }
        case "done": {
          streamIdRef.current = "";
          const d = event.data as { conversation_id?: string; usage?: UsageInfo };
          if (d.conversation_id && !convIdRef.current) {
            onConversationCreated(d.conversation_id);
          }
          if (d.usage) {
            setUsage(d.usage);
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
            { id: nextId(), role: "assistant", content: `Error: ${d.error || "unknown error"}`, timestamp: new Date() },
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
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: text, timestamp: new Date() },
      ]);
      setLoading(true);
      setUsage(null);
      scrollToBottom();
      try {
        await Chat(text, conversationId || "");
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: `${t("chat.error")}: ${err instanceof Error ? err.message : "unknown"}`, timestamp: new Date() },
        ]);
        setLoading(false);
      }
    },
    [conversationId, scrollToBottom, t]
  );

  const handleStopChat = useCallback(() => {
    StopChat();
    setLoading(false);
  }, []);

  const handleEditMessage = useCallback(
    async (msgIndex: number, newContent: string) => {
      if (!conversationId) return;
      setLoading(true);
      setUsage(null);
      try {
        await EditMessage(conversationId, msgIndex, newContent);
      } catch (err) {
        console.error("Edit message failed:", err);
        setLoading(false);
      }
    },
    [conversationId]
  );

  const handleDeleteMessage = useCallback(
    (msgIndex: number) => {
      setPendingDeleteIndex(msgIndex);
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!conversationId || pendingDeleteIndex === null) return;
    try {
      await DeleteMessage(conversationId, pendingDeleteIndex);
      // Reload messages
      const msgs = await GetConversationMessages(conversationId);
      setMessages(
        (msgs || []).map((m: { id: string; role: string; content: string; tool_name?: string; tool_args?: string }) => ({
          id: m.id,
          role: m.role as Message["role"],
          content: m.content || "",
          toolName: m.tool_name,
          toolArgs: m.tool_args,
          timestamp: new Date(),
        }))
      );
    } catch (err) {
      console.error("Delete message failed:", err);
    } finally {
      setPendingDeleteIndex(null);
    }
  }, [conversationId, pendingDeleteIndex]);

  const handleRetryMessage = useCallback(
    async (msgIndex: number) => {
      if (!conversationId) return;
      setLoading(true);
      setUsage(null);
      try {
        // Retry from the message before this assistant message
        await RegenerateFrom(conversationId, msgIndex);
      } catch (err) {
        console.error("Retry failed:", err);
        setLoading(false);
      }
    },
    [conversationId]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3">
        <div className="space-y-3 max-w-none md:max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 select-none">
              <div className="text-4xl opacity-15">K</div>
              <p className="text-sm text-muted-foreground/60">{t("chat.empty")}</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={idx === messages.length - 1 && msg.role === "assistant"}
              onEdit={msg.role === "user" ? (newContent) => handleEditMessage(idx, newContent) : undefined}
              onDelete={() => handleDeleteMessage(idx)}
              onRetry={msg.role === "assistant" && idx === messages.length - 1 ? () => handleRetryMessage(idx) : undefined}
            />
          ))}

          {/* Dangerous op confirmation */}
          {pendingConfirm && (
            <Card className="border-destructive/30 bg-destructive/5 py-3.5 gap-3">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">{t("confirm.title")}</span>
                </div>
                <div>
                  <Badge variant="outline" className="text-[11px] font-mono border-destructive/25 text-destructive px-1.5 py-0">
                    {pendingConfirm.name}
                  </Badge>
                  <pre className="mt-2 text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-32 leading-relaxed">
                    {formatJSON(pendingConfirm.arguments)}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleConfirm(true)}>
                    <Check className="w-3 h-3 mr-1" />
                    {t("confirm.approve")}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleConfirm(false)}>
                    <X className="w-3 h-3 mr-1" />
                    {t("confirm.reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thinking indicator */}
          {loading && !pendingConfirm && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-muted/80 px-5 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground h-4">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={pendingDeleteIndex !== null} onOpenChange={(open) => !open && setPendingDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("chat.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("chat.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="relative">
        {usage && (
          <div className="absolute -top-6 right-2 sm:right-4 flex items-center gap-2 text-[10px] text-muted-foreground/50 font-mono select-none">
            <span>{usage.prompt_tokens}+{usage.completion_tokens}={usage.total_tokens} tokens</span>
          </div>
        )}
        {loading && !pendingConfirm && (
          <div className="absolute -top-10 left-2 sm:left-4">
            <Button size="xs" variant="outline" onClick={handleStopChat} className="h-7">
              <StopCircle className="w-3 h-3 mr-1" />
              {t("chat.stop")}
            </Button>
          </div>
        )}
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
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
