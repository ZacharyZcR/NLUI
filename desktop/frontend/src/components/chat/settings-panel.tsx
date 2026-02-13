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
      <ScrollArea className="flex-1 px-6 py-5">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Auto-detected providers */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("settings.detected")}
              </h3>
              <Button variant="ghost" size="xs" onClick={scan} disabled={scanning}>
                {scanning ? t("settings.scanning") : t("settings.rescan")}
              </Button>
            </div>
            {providers.length === 0 && !scanning && (
              <p className="text-xs text-muted-foreground/50 py-4 text-center">{t("settings.noProviders")}</p>
            )}
            <div className="space-y-2">
              {providers.map((p) => (
                <Card key={p.name} className="px-4 py-3 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.api_base}</span>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => handleUseProvider(p)}>
                      {t("settings.use")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.models.slice(0, 6).map((m) => (
                      <Badge key={m} variant="secondary" className="text-[11px] font-mono">{m}</Badge>
                    ))}
                    {p.models.length > 6 && (
                      <Badge variant="secondary" className="text-[11px]">+{p.models.length - 6}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Manual config */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("settings.manual")}
            </h3>
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
                      <Badge
                        key={m}
                        variant={m === model ? "default" : "outline"}
                        className="text-[11px] font-mono cursor-pointer"
                        onClick={() => setModel(m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model name" />
                </div>
              ) : (
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="qwen2.5:7b / gpt-4o / ..." />
              )}
            </div>
          </section>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSaveLLM} disabled={saving || !apiBase || !model}>
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
