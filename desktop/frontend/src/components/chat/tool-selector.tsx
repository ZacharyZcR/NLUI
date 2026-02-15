import { useCallback, useEffect, useState } from "react";
import { Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { GetAvailableSources, GetToolConfig, UpdateToolConfig, CreateEmptyConversation } from "../../../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../../../wailsjs/runtime/runtime";

interface ToolSelectorProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

interface SourceInfo {
  name: string;
  tools: ToolSummary[];
}

interface ToolSummary {
  name: string;
  display_name: string;
  description: string;
}

interface ToolConfig {
  enabled_sources: string[];
  disabled_tools: string[];
}

export function ToolSelector({ conversationId, onConversationCreated }: ToolSelectorProps) {
  const { t } = useI18n();
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [config, setConfig] = useState<ToolConfig>({ enabled_sources: [], disabled_tools: [] });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);

  const loadData = useCallback(async () => {
    const availableSources = await GetAvailableSources();
    setSources(availableSources || []);

    if (conversationId) {
      const cfg = await GetToolConfig(conversationId);
      setConfig(cfg || { enabled_sources: [], disabled_tools: [] });
    }
  }, [conversationId]);

  useEffect(() => {
    loadData();

    // Listen for tools-updated event from backend
    EventsOn("tools-updated", () => {
      loadData();
    });

    return () => {
      EventsOff("tools-updated");
    };
  }, [loadData]);

  const toggleSource = useCallback(
    async (sourceName: string) => {
      let activeConvId = conversationId;

      // If no conversation exists, create one first
      if (!activeConvId) {
        activeConvId = await CreateEmptyConversation();
        if (activeConvId && onConversationCreated) {
          onConversationCreated(activeConvId);
        }
      }

      if (!activeConvId) return;

      const currentEnabled = config.enabled_sources || [];
      let newEnabled: string[];

      if (currentEnabled.length === 0) {
        // All enabled → disable others
        newEnabled = [sourceName];
      } else if (currentEnabled.includes(sourceName)) {
        // Remove this source
        newEnabled = currentEnabled.filter((s) => s !== sourceName);
      } else {
        // Add this source
        newEnabled = [...currentEnabled, sourceName];
      }

      await UpdateToolConfig(activeConvId, newEnabled, config.disabled_tools || []);

      // Reload config from backend to ensure UI reflects actual state
      const updatedConfig = await GetToolConfig(activeConvId);
      setConfig(updatedConfig || { enabled_sources: [], disabled_tools: [] });
    },
    [conversationId, config, onConversationCreated]
  );

  const toggleTool = useCallback(
    async (toolName: string) => {
      let activeConvId = conversationId;

      // If no conversation exists, create one first
      if (!activeConvId) {
        activeConvId = await CreateEmptyConversation();
        if (activeConvId && onConversationCreated) {
          onConversationCreated(activeConvId);
        }
      }

      if (!activeConvId) return;

      const currentDisabled = config.disabled_tools || [];
      let newDisabled: string[];

      if (currentDisabled.includes(toolName)) {
        newDisabled = currentDisabled.filter((t) => t !== toolName);
      } else {
        newDisabled = [...currentDisabled, toolName];
      }

      await UpdateToolConfig(activeConvId, config.enabled_sources || [], newDisabled);

      // Reload config from backend to ensure UI reflects actual state
      const updatedConfig = await GetToolConfig(activeConvId);
      setConfig(updatedConfig || { enabled_sources: [], disabled_tools: [] });
    },
    [conversationId, config, onConversationCreated]
  );

  const toggleExpanded = (sourceName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sourceName)) {
        next.delete(sourceName);
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  const isSourceEnabled = (sourceName: string) => {
    const enabledSources = config.enabled_sources || [];
    return enabledSources.length === 0 || enabledSources.includes(sourceName);
  };

  const isToolDisabled = (toolName: string) => {
    return (config.disabled_tools || []).includes(toolName);
  };

  const enabledSources = config.enabled_sources || [];
  const enabledCount = enabledSources.length === 0 ? sources.length : enabledSources.length;

  const handleTogglePanel = useCallback(() => {
    if (!showPanel) {
      // Reload data when opening panel to get latest tools
      loadData();
    }
    setShowPanel(!showPanel);
  }, [showPanel, loadData]);

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button size="xs" variant="outline" onClick={handleTogglePanel} className="h-7 gap-1.5">
        <Settings2 className="w-3.5 h-3.5" />
        <span className="text-xs">
          {enabledCount}/{sources.length} {t("toolconfig.source")}
        </span>
      </Button>

      {/* Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <Card className="absolute bottom-full mb-2 left-0 w-96 max-h-96 overflow-y-auto z-50 shadow-lg">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("toolconfig.title")}</span>
                {config.enabled_sources.length === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {t("toolconfig.allSources")}
                  </Badge>
                )}
              </div>

              {sources.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{t("toolconfig.noSources")}</p>
              )}

              {sources.map((src) => {
                const enabled = isSourceEnabled(src.name);
                const isExpanded = expanded.has(src.name);

                return (
                  <div key={src.name} className="border rounded-md overflow-hidden">
                    <div className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer" onClick={() => toggleExpanded(src.name)}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSource(src.name);
                        }}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          enabled ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {enabled && <div className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                      </button>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <span className="text-sm font-medium flex-1">{src.name}</span>
                      <span className="text-xs text-muted-foreground">{src.tools.length}</span>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-2 space-y-1">
                        {src.tools.map((tool) => {
                          const toolDisabled = isToolDisabled(tool.name);
                          const toolEnabled = enabled && !toolDisabled;

                          return (
                            <div key={tool.name} className="flex items-start gap-2 p-1.5 hover:bg-background rounded">
                              <button
                                onClick={() => toggleTool(tool.name)}
                                disabled={!enabled}
                                className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 ${
                                  toolEnabled
                                    ? "bg-primary border-primary"
                                    : toolDisabled
                                    ? "border-muted-foreground/30 bg-muted"
                                    : "border-muted-foreground/30"
                                } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                {toolEnabled && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-sm m-auto" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-mono text-foreground/80">{tool.display_name}</div>
                                {tool.description && <div className="text-[10px] text-muted-foreground truncate">{tool.description}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
