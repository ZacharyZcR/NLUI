import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { GetAuthStatus } from "../../../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";

interface TargetAuth {
  name: string;
  auth_type: string;
  has_token: boolean;
}

export function AuthIndicator() {
  const [targets, setTargets] = useState<TargetAuth[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await GetAuthStatus();
      setTargets((result as TargetAuth[]) || []);
    } catch {
      setTargets([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    // Refresh on tools-updated (reinit) and on any chat event (set_auth tool result)
    const onToolsUpdated = () => refreshRef.current();
    const onChatEvent = (event: { type: string; data?: { name?: string } }) => {
      if (event.type === "tool_result" && event.data?.name?.endsWith("__set_auth")) {
        refreshRef.current();
      }
    };
    EventsOn("tools-updated", onToolsUpdated);
    EventsOn("chat-event", onChatEvent);
    return () => {
      EventsOff("tools-updated");
      EventsOff("chat-event");
    };
  }, []);

  // No targets need auth → hide
  if (targets.length === 0) return null;

  const allOk = targets.every((t) => t.has_token);
  const noneOk = targets.every((t) => !t.has_token);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={`flex items-center gap-1 h-7 px-2 rounded-md border text-xs transition-colors ${
          allOk
            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            : noneOk
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
        }`}
      >
        {allOk ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : noneOk ? (
          <ShieldAlert className="w-3.5 h-3.5" />
        ) : (
          <Shield className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {targets.filter((t) => t.has_token).length}/{targets.length}
        </span>
      </button>

      {showDetail && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetail(false)} />
          <div className="absolute bottom-full mb-2 left-0 z-50 bg-popover border rounded-lg shadow-lg p-2.5 min-w-48 space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Auth Status</div>
            {targets.map((t) => (
              <div key={t.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono truncate">{t.name}</span>
                {t.has_token ? (
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 gap-0.5 shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] text-destructive gap-0.5 shrink-0">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    No Key
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
