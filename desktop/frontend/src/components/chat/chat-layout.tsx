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
  const { t, theme, toggleLang, toggleTheme } = useI18n();
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [ready, setReady] = useState(false);

  const checkReady = useCallback(async () => {
    try {
      const info = await GetInfo();
      setReady(!!info.ready);
      if (!info.ready) setView("settings");
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

  const handleNew = useCallback(() => setActiveId(null), []);

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

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Title bar — draggable for Wails window */}
        <header className="wails-drag flex items-center justify-between px-5 h-12 border-b bg-card/60 backdrop-blur-sm shrink-0">
          <h1 className="text-sm font-semibold tracking-wide select-none">
            {t("app.title")}
          </h1>
          <nav className="wails-nodrag flex items-center gap-0.5">
            {(["targets", "tools", "settings"] as const).map((key) => (
              <Button
                key={key}
                variant={view === key ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => toggleView(key)}
              >
                {t(`${key}.btn` as "targets.btn" | "tools.btn" | "settings.btn")}
              </Button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-7 h-7"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "\u2600" : "\u263E"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-7 h-7 font-medium"
              onClick={toggleLang}
            >
              {t("lang.switch")}
            </Button>
          </nav>
        </header>

        {view === "settings" ? (
          <SettingsPanel onSaved={handleSettingsSaved} onClose={() => setView("chat")} />
        ) : view === "targets" ? (
          <TargetsPanel onClose={() => setView("chat")} />
        ) : view === "tools" ? (
          <ToolsPanel onClose={() => setView("chat")} />
        ) : (
          <ChatMain conversationId={activeId} onConversationCreated={handleConversationCreated} />
        )}
      </div>
    </div>
  );
}
