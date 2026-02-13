"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import { useI18n } from "@/lib/i18n";
import {
  listConversations,
  deleteConversation,
  type Conversation,
} from "@/lib/api";

export function ChatLayout() {
  const { t, toggle } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const convs = await listConversations();
    setConversations(convs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNew = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (activeId === id) setActiveId(null);
      refresh();
    },
    [activeId, refresh]
  );

  const handleConversationCreated = useCallback(
    (id: string) => {
      setActiveId(id);
      refresh();
    },
    [refresh]
  );

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between px-4 py-2 border-b">
          <h1 className="text-sm font-semibold">{t("app.title")}</h1>
          <Button variant="ghost" size="sm" className="text-xs w-8 h-8" onClick={toggle}>
            {t("lang.switch")}
          </Button>
        </header>
        <ChatMain
          conversationId={activeId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
