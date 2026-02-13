"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import {
  listConversations,
  deleteConversation,
  type Conversation,
} from "@/lib/api";

export function ChatLayout() {
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
      <ChatMain
        conversationId={activeId}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
