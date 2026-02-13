import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import {
  ProbeProviders,
  FetchModels,
  SaveLLMConfig,
  GetCurrentConfig,
} from "../../../wailsjs/go/main/App";

interface ProviderInfo {
  name: string;
  api_base: string;
  models: string[];
}

interface SettingsPanelProps {
  onSaved: () => void;
  onClose: () => void;
}

export function SettingsPanel({ onSaved, onClose }: SettingsPanelProps) {
  const { t } = useI18n();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [apiBase, setApiBase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await ProbeProviders();
      setProviders(result || []);
    } catch {
      setProviders([]);
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    scan();
    GetCurrentConfig().then((cfg) => {
      if (cfg.exists) {
        setApiBase((cfg.api_base as string) || "");
        setModel((cfg.model as string) || "");
      }
    });
  }, [scan]);

  const handleUseProvider = (p: ProviderInfo) => {
    setApiBase(p.api_base);
    setApiKey("");
    setModels(p.models);
    if (p.models.length > 0) setModel(p.models[0]);
    setError("");
  };

  const handleFetchModels = async () => {
    if (!apiBase) return;
    setLoadingModels(true);
    try {
      const result = await FetchModels(apiBase, apiKey);
      setModels(result || []);
      if (result && result.length > 0 && !model) setModel(result[0]);
    } catch {
      setModels([]);
    }
    setLoadingModels(false);
  };

  const handleSaveLLM = async () => {
    if (!apiBase || !model) {
      setError(t("settings.required"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await SaveLLMConfig(apiBase, apiKey, model);
      if (result) {
        setError(result);
      } else {
        onSaved();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-semibold">{t("settings.title")}</h2>
        <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
          {t("settings.close")}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Auto-detected providers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("settings.detected")}</span>
              <Button variant="outline" size="xs" onClick={scan} disabled={scanning}>
                {scanning ? t("settings.scanning") : t("settings.rescan")}
              </Button>
            </div>
            {providers.length === 0 && !scanning && (
              <p className="text-xs text-muted-foreground py-3 text-center">{t("settings.noProviders")}</p>
            )}
            <div className="space-y-2">
              {providers.map((p) => (
                <Card key={p.name} className="px-4 py-3 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 text-xs">&#9679;</span>
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.api_base}</span>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => handleUseProvider(p)}>
                      {t("settings.use")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.models.slice(0, 6).map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs font-mono">{m}</Badge>
                    ))}
                    {p.models.length > 6 && (
                      <Badge variant="secondary" className="text-xs">+{p.models.length - 6}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Manual LLM config */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">API Base</label>
              <div className="flex gap-2">
                <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://localhost:11434/v1" />
                <Button variant="outline" size="sm" onClick={handleFetchModels} disabled={!apiBase || loadingModels}>
                  {loadingModels ? "..." : t("settings.fetchModels")}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t("settings.keyPlaceholder")} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Model</label>
              {models.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {models.map((m) => (
                      <Badge key={m} variant={m === model ? "default" : "outline"} className="text-xs font-mono cursor-pointer" onClick={() => setModel(m)}>{m}</Badge>
                    ))}
                  </div>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model name" />
                </div>
              ) : (
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="qwen2.5:7b / gpt-4o / ..." />
              )}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSaveLLM} disabled={saving || !apiBase || !model}>
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>

        </div>
      </ScrollArea>
    </div>
  );
}
