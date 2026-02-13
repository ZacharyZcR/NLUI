import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import { SettingsPanel } from "./settings-panel";
import { TargetsPanel } from "./targets-panel";
import { ToolsPanel } from "./tools-panel";
import { useI18n } from "@/lib/i18n";
import { ListConversations, DeleteConversation, GetInfo } from "../../../wailsjs/go/main/App";

type View = "chat" | "settings" | "targets" | "tools";

interface ConversationInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function ChatLayout() {
  const { t, toggle } = useI18n();
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [ready, setReady] = useState(false);

  const checkReady = useCallback(async () => {
    try {
      const info = await GetInfo();
      setReady(!!info.ready);
      if (!info.ready) {
        setView("settings");
      }
    } catch {
      setView("settings");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const convs = await ListConversations();
      setConversations(convs || []);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    checkReady();
    refresh();
  }, [checkReady, refresh]);

  const handleNew = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await DeleteConversation(id);
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

  const handleSettingsSaved = useCallback(() => {
    setView("chat");
    setReady(true);
    refresh();
  }, [refresh]);

  const toggleView = (target: View) => setView(view === target ? "chat" : target);

  const navBtn = (key: View, label: string) => (
    <Button
      variant={view === key ? "secondary" : "ghost"}
      size="sm"
      className="text-xs h-8 px-2"
      onClick={() => toggleView(key)}
    >
      {label}
    </Button>
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
        <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50">
          <h1 className="text-sm font-semibold">{t("app.title")}</h1>
          <div className="flex items-center gap-1">
            {navBtn("targets", t("targets.btn"))}
            {navBtn("tools", t("tools.btn"))}
            {navBtn("settings", t("settings.btn"))}
            <Button variant="ghost" size="sm" className="text-xs w-8 h-8" onClick={toggle}>
              {t("lang.switch")}
            </Button>
          </div>
        </header>

        {view === "settings" ? (
          <SettingsPanel
            onSaved={handleSettingsSaved}
            onClose={() => setView("chat")}
          />
        ) : view === "targets" ? (
          <TargetsPanel onClose={() => setView("chat")} />
        ) : view === "tools" ? (
          <ToolsPanel onClose={() => setView("chat")} />
        ) : (
          <ChatMain
            conversationId={activeId}
            onConversationCreated={handleConversationCreated}
          />
        )}
      </div>
    </div>
  );
}
