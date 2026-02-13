import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  // Group by target
  const grouped = tools.reduce<Record<string, ToolInfo[]>>((acc, tool) => {
    const key = tool.target_name || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(tool);
    return acc;
  }, {});

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-semibold">{t("tools.title")}</h2>
        <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
          {t("settings.close")}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {configDir && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              {configDir}
            </div>
          )}

          {tools.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center">
              {t("tools.empty")}
            </p>
          )}

          {Object.entries(grouped).map(([target, items]) => (
            <section key={target} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {target}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {items.map((tool) => {
                  const key = `${target}__${tool.name}`;
                  const isExpanded = expanded.has(key);
                  return (
                    <Card
                      key={key}
                      className="px-4 py-3 gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(key)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono font-medium">
                          {tool.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </div>
                      {tool.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {tool.description}
                        </div>
                      )}
                      {isExpanded && tool.parameters && (
                        <pre className="mt-2 text-xs bg-muted/50 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
