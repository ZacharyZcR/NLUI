import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { useI18n } from "@/lib/i18n";
import { ListTools, GetConfigDir } from "../../../wailsjs/go/main/App";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const result = await ListTools();
      setTools(result || []);
    } catch {
      setTools([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    GetConfigDir().then(setConfigDir).catch(() => {});
  }, [refresh]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
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

          {Object.entries(grouped).map(([target, items]) => (
            <section key={target} className="space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {target}
                </h3>
                <Badge variant="secondary" className="text-[11px]">
                  {items.length}
                </Badge>
              </div>

              {items.map((tool) => {
                const key = `${target}__${tool.name}`;
                const isExpanded = expanded.has(key);
                return (
                  <Card
                    key={key}
                    className="px-3.5 py-2.5 gap-0.5 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggleExpand(key)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-mono font-medium truncate">
                        {tool.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground/40 ml-2 shrink-0">
                        {isExpanded ? "\u2212" : "+"}
                      </span>
                    </div>
                    {tool.description && (
                      <div className="text-xs text-muted-foreground/70 line-clamp-1">
                        {tool.description}
                      </div>
                    )}
                    {isExpanded && tool.parameters && (
                      <pre className="mt-2 text-[11px] bg-muted/40 rounded-lg p-3 overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(tool.parameters, null, 2)}
                      </pre>
                    )}
                  </Card>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
