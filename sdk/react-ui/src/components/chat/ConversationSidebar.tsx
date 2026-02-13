import { X, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import type { Conversation } from "@/lib/types";

export interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: ConversationSidebarProps) {
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
      <div className="p-3 pb-2">
        <Button
          onClick={handleNew}
          className="w-full justify-center"
          variant="outline"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Chat
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-2 pb-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-10 opacity-50">
              No conversations yet
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
                  {conv.title || "Untitled"}
                </span>
                <span className="text-[10px] opacity-40 ml-2 shrink-0 group-hover:hidden">
                  {relativeTime(conv.updatedAt)}
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
