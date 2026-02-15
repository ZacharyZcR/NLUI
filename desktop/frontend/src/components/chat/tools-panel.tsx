import { useCallback, useEffect, useState } from "react";
import { Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { useI18n } from "@/lib/i18n";
import { ListTools, GetConfigDir } from "../../../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";

interface ToolInfo {
  target_name: string;
  name: string;
  description: string;
  parameters: Record<string, unknown> | null;
}

interface ToolsPanelProps {
  onClose: () => void;
}

export function ToolsPanel({ onClose }: ToolsPanelProps) {
  const { t } = useI18n();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [configDir, setConfigDir] = useState("");
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const result = await ListTools();
      setTools(result || []);
      // Auto-expand all targets when loaded
      const targets = new Set(result.map((t) => t.target_name || "unknown"));
      setExpandedTargets(targets);
    } catch {
      setTools([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    GetConfigDir().then(setConfigDir).catch(() => {});

    // Listen for tools-updated event from backend
    EventsOn("tools-updated", () => {
      refresh();
    });

    return () => {
      EventsOff("tools-updated");
    };
  }, [refresh]);

  const toggleTarget = (target: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  };

  const toggleTool = (key: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const grouped = tools.reduce<Record<string, ToolInfo[]>>((acc, tool) => {
    const key = tool.target_name || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(tool);
    return acc;
  }, {});

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
        <div className="max-w-none sm:max-w-lg mx-auto space-y-5">
          {configDir && (
            <div className="text-[11px] text-muted-foreground/40 font-mono truncate">
              {configDir}
            </div>
          )}

          {tools.length === 0 && (
            <p className="text-xs text-muted-foreground/50 py-10 text-center">
              {t("tools.empty")}
            </p>
          )}

          {Object.entries(grouped).map(([target, items]) => {
            const isTargetExpanded = expandedTargets.has(target);
            return (
              <section key={target} className="space-y-1.5">
                <div
                  className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2"
                  onClick={() => toggleTarget(target)}
                >
                  {isTargetExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
                    {target}
                  </h3>
                  <Badge variant="secondary" className="text-[11px]">
                    {items.length}
                  </Badge>
                </div>

                {isTargetExpanded && items.map((tool) => {
                  const key = `${target}__${tool.name}`;
                  const isToolExpanded = expandedTools.has(key);
                  return (
                    <Card
                      key={key}
                      className="px-3.5 py-2.5 gap-0.5 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTool(key);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-mono font-medium truncate">
                          {tool.name}
                        </span>
                        <span className="text-muted-foreground/40 ml-2 shrink-0">
                          {isToolExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </span>
                      </div>
                      {tool.description && (
                        <div className="text-xs text-muted-foreground/70 line-clamp-1">
                          {tool.description}
                        </div>
                      )}
                      {isToolExpanded && tool.parameters && (
                        <pre className="mt-2 text-[11px] bg-muted/40 rounded-lg p-3 overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      )}
                    </Card>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
