import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface ConversationInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: ConversationInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete, onClose }: ChatSidebarProps) {
  const { t } = useI18n();

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose?.();
  };

  const handleNew = () => {
    onNew();
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full w-56 shrink-0 border-r bg-card/80">
      <div className="wails-drag p-3 pb-2">
        <Button
          onClick={handleNew}
          className="wails-nodrag w-full justify-center"
          variant="outline"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t("sidebar.new")}
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-2 pb-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-10 opacity-50">
              {t("sidebar.empty")}
            </p>
          )}
          {conversations.map((conv) => {
            const active = activeId === conv.id;
            return (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-lg px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
                onClick={() => handleSelect(conv.id)}
              >
                <span className="flex-1 truncate">
                  {conv.title || t("sidebar.untitled")}
                </span>
                <span className="text-[10px] opacity-40 ml-2 shrink-0 group-hover:hidden">
                  {relativeTime(conv.updated_at)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="hidden group-hover:flex w-5 h-5 shrink-0 ml-1 p-0 hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
