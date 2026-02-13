import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, ChevronDown, ChevronRight, Key, Download, Loader2, Braces, PawPrint, CloudSun, Package, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useI18n } from "@/lib/i18n";
import { ListTools, ListTargets, ListPresets, ImportPreset } from "../../../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";

interface ToolInfo {
  target_name: string;
  group: string;
  name: string;
  description: string;
  parameters: Record<string, unknown> | null;
}

interface PresetInfo {
  name: string;
  target: string;
  base_url: string;
  description: string;
  tools: number;
  needs_auth: boolean;
}

interface ToolsPanelProps {
  onClose: () => void;
}

interface GroupData {
  tools: ToolInfo[];
}

interface TargetData {
  groups: Record<string, GroupData>;
  totalTools: number;
}

const presetMeta: Record<string, { icon: LucideIcon; color: string }> = {
  jsonplaceholder: { icon: Braces, color: "text-blue-500" },
  petstore:        { icon: PawPrint, color: "text-amber-500" },
  openweathermap:  { icon: CloudSun, color: "text-cyan-500" },
};

export function ToolsPanel({ onClose }: ToolsPanelProps) {
  const { t } = useI18n();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [presetList, setPresetList] = useState<PresetInfo[]>([]);
  const [targetNames, setTargetNames] = useState<Set<string>>(new Set());
  const [importingPreset, setImportingPreset] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await ListTools();
      setTools(result || []);
      const targets = new Set((result || []).map((t) => t.target_name || "unknown"));
      setExpanded(targets);
    } catch {
      setTools([]);
    }
  }, []);

  const refreshTargetNames = useCallback(async () => {
    try {
      const tgts = await ListTargets();
      setTargetNames(new Set((tgts || []).map((t: any) => t.name)));
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    refreshTargetNames();
    ListPresets().then((r) => setPresetList((r as PresetInfo[]) || [])).catch(() => {});
  }, [refresh, refreshTargetNames]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    EventsOn("tools-updated", () => {
      refreshRef.current();
    });
    return () => {
      EventsOff("tools-updated");
    };
  }, []);

  const availablePresets = presetList.filter((p) => !targetNames.has(p.name));

  const handleImportPreset = async (name: string) => {
    setImportingPreset(name);
    try {
      const err = await ImportPreset(name);
      if (!err) {
        refresh();
        refreshTargetNames();
      }
    } catch {}
    setImportingPreset(null);
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  // Build target → group → tools hierarchy
  const hierarchy = tools.reduce<Record<string, TargetData>>((acc, tool) => {
    const target = tool.target_name || "unknown";
    const group = tool.group || "default";
    if (!acc[target]) acc[target] = { groups: {}, totalTools: 0 };
    if (!acc[target].groups[group]) acc[target].groups[group] = { tools: [] };
    acc[target].groups[group].tools.push(tool);
    acc[target].totalTools++;
    return acc;
  }, {});

  const isEmpty = tools.length === 0 && availablePresets.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
        <div className="max-w-none sm:max-w-2xl mx-auto space-y-5">
          {isEmpty && (
            <p className="text-xs text-muted-foreground/50 py-10 text-center">
              {t("tools.empty")}
            </p>
          )}

          {/* Presets grid */}
          {availablePresets.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t("targets.presets")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availablePresets.map((p) => {
                  const meta = presetMeta[p.name] || { icon: Package, color: "text-muted-foreground" };
                  const Icon = meta.icon;
                  const isImporting = importingPreset === p.name;

                  return (
                    <Card
                      key={p.name}
                      className="relative px-5 py-5 gap-3 flex flex-col hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/60 ${meta.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {p.needs_auth && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                            <Key className="w-2.5 h-2.5" /> API Key
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{p.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{p.tools} tools</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                        <div className="text-[11px] text-muted-foreground/50 font-mono truncate">{p.base_url}</div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1"
                        disabled={isImporting}
                        onClick={() => handleImportPreset(p.name)}
                      >
                        {isImporting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          : <Download className="w-3.5 h-3.5 mr-1.5" />}
                        {t("targets.import")}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tool hierarchy */}
          {Object.entries(hierarchy).map(([target, data]) => {
            const isTargetExpanded = expanded.has(target);
            const groupEntries = Object.entries(data.groups).sort((a, b) => a[0].localeCompare(b[0]));
            const hasMultipleGroups = groupEntries.length > 1;

            return (
              <section key={target} className="space-y-1">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1.5 -mx-2"
                  onClick={() => toggle(target)}
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
                    {hasMultipleGroups ? `${groupEntries.length} modules · ` : ""}{data.totalTools}
                  </Badge>
                </div>

                {isTargetExpanded && groupEntries.map(([group, groupData]) => {
                  const groupKey = `${target}::${group}`;

                  if (!hasMultipleGroups) {
                    return (
                      <div key={groupKey} className="space-y-1 pl-2">
                        {groupData.tools.map((tool, i) => (
                          <ToolCard
                            key={`${groupKey}__${i}__${tool.name}`}
                            tool={tool}
                            toolKey={`${groupKey}__${i}__${tool.name}`}
                            isExpanded={expandedTools.has(`${groupKey}__${i}__${tool.name}`)}
                            onToggle={toggleTool}
                          />
                        ))}
                      </div>
                    );
                  }

                  const isGroupExpanded = expanded.has(groupKey);
                  return (
                    <div key={groupKey} className="pl-4">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded px-2 py-1 -mx-2"
                        onClick={() => toggle(groupKey)}
                      >
                        {isGroupExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground/80 flex-1">
                          {group}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {groupData.tools.length}
                        </span>
                      </div>

                      {isGroupExpanded && (
                        <div className="space-y-1 pl-2 mt-1">
                          {groupData.tools.map((tool, i) => (
                            <ToolCard
                              key={`${groupKey}__${i}__${tool.name}`}
                              tool={tool}
                              toolKey={`${groupKey}__${i}__${tool.name}`}
                              isExpanded={expandedTools.has(`${groupKey}__${i}__${tool.name}`)}
                              onToggle={toggleTool}
                            />
                          ))}
                        </div>
                      )}
                    </div>
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

function ToolCard({ tool, toolKey, isExpanded, onToggle }: {
  tool: ToolInfo;
  toolKey: string;
  isExpanded: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <Card
      className="px-3.5 py-2.5 gap-0.5 cursor-pointer hover:bg-muted/40 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(toolKey);
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-mono font-medium truncate">
          {tool.name}
        </span>
        <span className="text-muted-foreground/40 ml-2 shrink-0">
          {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
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
}
