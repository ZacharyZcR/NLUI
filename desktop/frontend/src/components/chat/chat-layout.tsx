import { useCallback, useEffect, useState } from "react";
import { Menu, Sun, Moon, Target, Wrench, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain } from "./chat-main";
import { SettingsPanel } from "./settings-panel";
import { TargetsPanel } from "./targets-panel";
import { ToolsPanel } from "./tools-panel";
import { useI18n } from "@/lib/i18n";
import { ListConversations, DeleteConversation, GetInfo, SetWindowTitle } from "../../../wailsjs/go/main/App";

type View = "chat" | "settings" | "targets" | "tools";

interface ConversationInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function ChatLayout() {
  const { t, theme, toggleLang, toggleTheme, locale } = useI18n();
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update window title when locale changes
  useEffect(() => {
    SetWindowTitle(t("window.title"));
  }, [locale, t]);

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — always visible on md+, overlay on <md */}
      <div className="hidden md:flex">
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onDelete={handleDelete}
        />
      </div>
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <ChatSidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={setActiveId}
              onNew={handleNew}
              onDelete={handleDelete}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Title bar — optimized for better visual hierarchy */}
        <header className="wails-drag flex items-center justify-between px-4 h-14 border-b bg-gradient-to-b from-background to-background/95 backdrop-blur-sm shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="wails-nodrag md:hidden w-8 h-8 p-0 hover:bg-accent"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4.5 h-4.5" />
            </Button>
            <h1 className="text-base font-bold tracking-tight select-none bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("app.title")}
            </h1>
          </div>
          <nav className="wails-nodrag flex items-center gap-1">
            {(["targets", "tools", "settings"] as const).map((key) => {
              const Icon = key === "targets" ? Target : key === "tools" ? Wrench : Settings;
              return (
                <Button
                  key={key}
                  variant={view === key ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-8 px-3 font-medium transition-all"
                  onClick={() => toggleView(key)}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {t(`${key}.btn` as "targets.btn" | "tools.btn" | "settings.btn")}
                </Button>
              );
            })}
            <div className="w-px h-5 bg-border/60 mx-1.5" />
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-accent transition-colors"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs w-8 h-8 font-semibold hover:bg-accent transition-colors"
              onClick={toggleLang}
              title="Switch language"
            >
              {t("lang.switch")}
            </Button>
          </nav>
        </header>

        <div className={view === "settings" ? "flex flex-col flex-1 overflow-hidden" : "hidden"}>
          <SettingsPanel onSaved={handleSettingsSaved} onClose={() => setView("chat")} />
        </div>
        <div className={view === "targets" ? "flex flex-col flex-1 overflow-hidden" : "hidden"}>
          <TargetsPanel onClose={() => setView("chat")} />
        </div>
        <div className={view === "tools" ? "flex flex-col flex-1 overflow-hidden" : "hidden"}>
          <ToolsPanel onClose={() => setView("chat")} />
        </div>
        <div className={view === "chat" ? "flex flex-col flex-1 overflow-hidden" : "hidden"}>
          <ChatMain conversationId={activeId} onConversationCreated={handleConversationCreated} />
        </div>
      </div>
    </div>
  );
}
