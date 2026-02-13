import { useCallback, useEffect, useState } from "react";
import { Check, Shield, Play, RefreshCw, Download, ArrowRight, Globe, Key, Cpu, Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useI18n } from "@/lib/i18n";
import {
  ProbeProviders,
  FetchModels,
  SaveLLMConfig,
  SaveLanguage,
  SaveStream,
  SaveProxy,
  TestProxy,
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
  const [proxy, setProxy] = useState("");
  const [proxySaved, setProxySaved] = useState("");
  const [savingProxy, setSavingProxy] = useState(false);
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<"ok" | "fail" | "">("");
  const [promptLang, setPromptLang] = useState("en");
  const [stream, setStream] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");

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
        setApiKey((cfg.api_key as string) || "");
        setModel((cfg.model as string) || "");
        setPromptLang((cfg.language as string) || "en");
        setStream(cfg.stream !== false);
        const p = (cfg.proxy as string) || "";
        setProxy(p);
        setProxySaved(p);
      }
    });
  }, [scan]);

  const handleSaveLanguage = async (lang: string) => {
    setPromptLang(lang);
    await SaveLanguage(lang);
    onSaved();
  };

  const handleToggleStream = async (v: boolean) => {
    setStream(v);
    await SaveStream(v);
    onSaved();
  };

  const handleSaveProxy = async () => {
    setSavingProxy(true);
    setError("");
    try {
      const result = await SaveProxy(proxy);
      if (result) {
        setError(result);
      } else {
        setProxySaved(proxy);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    }
    setSavingProxy(false);
  };

  const handleTestProxy = async () => {
    setTestingProxy(true);
    setProxyTestResult("");
    try {
      const result = await TestProxy(proxy);
      setProxyTestResult(result ? "fail" : "ok");
    } catch {
      setProxyTestResult("fail");
    }
    setTestingProxy(false);
  };

  const handleUseProvider = (p: ProviderInfo) => {
    setApiBase(p.api_base);
    setApiKey("");
    setModel("");
    setFetchStatus("");
    const m = p.models || [];
    setModels(m);
    if (m.length > 0) setModel(m[0]);
    setError("");
  };

  const handleFetchModels = async () => {
    if (!apiBase) return;
    setLoadingModels(true);
    setFetchStatus("");
    setError("");
    try {
      const result = await FetchModels(apiBase, apiKey);
      const list = result || [];
      setModels(list);
      if (list.length > 0) {
        setModel(list[0]);
        setFetchStatus(t("settings.fetchSuccess").replace("{n}", String(list.length)));
      } else {
        setFetchStatus(t("settings.fetchEmpty"));
      }
    } catch {
      setModels([]);
      setFetchStatus(t("settings.fetchFailed"));
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

  const proxyDirty = proxy !== proxySaved;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
        <div className="max-w-none sm:max-w-lg mx-auto space-y-5">

          {/* Prompt Language */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Languages className="w-3 h-3 inline mr-1.5" />
              {t("settings.promptLang")}
            </h3>
            <div className="flex gap-2">
              {([["zh", "中文"], ["en", "English"], ["ja", "日本語"]] as const).map(([code, label]) => (
                <Button
                  key={code}
                  size="sm"
                  variant={promptLang === code ? "default" : "outline"}
                  className="text-xs h-8 flex-1"
                  onClick={() => handleSaveLanguage(code)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">{t("settings.promptLangHint")}</p>
          </section>

          {/* Stream toggle */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("settings.stream")}
            </h3>
            <div className="flex gap-2">
              {([true, false] as const).map((v) => (
                <Button
                  key={String(v)}
                  size="sm"
                  variant={stream === v ? "default" : "outline"}
                  className="text-xs h-8 flex-1"
                  onClick={() => handleToggleStream(v)}
                >
                  {v ? t("settings.streamOn") : t("settings.streamOff")}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">{t("settings.streamHint")}</p>
          </section>

          {/* Proxy */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("settings.proxy")}
            </h3>
            <div className="flex gap-2">
              <Input
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder={t("settings.proxyPlaceholder")}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveProxy}
                disabled={savingProxy || !proxyDirty}
              >
                {savingProxy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span className="ml-1.5">{t("settings.proxySave")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestProxy}
                disabled={testingProxy || !proxySaved}
              >
                {testingProxy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span className="ml-1.5">{t("settings.proxyTest")}</span>
              </Button>
            </div>
            {proxyTestResult && (
              <p className={`text-[11px] ${proxyTestResult === "ok" ? "text-emerald-500" : "text-destructive"}`}>
                {proxyTestResult === "ok" ? t("settings.proxyOk") : t("settings.proxyFail")}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/60">{t("settings.proxyHint")}</p>
          </section>

          {/* Preset / auto-detected providers */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("settings.detected")}
              </h3>
              <Button variant="ghost" size="xs" onClick={scan} disabled={scanning}>
                {scanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                {scanning ? t("settings.scanning") : t("settings.rescan")}
              </Button>
            </div>
            {providers.length === 0 && !scanning && (
              <p className="text-xs text-muted-foreground/50 py-4 text-center">{t("settings.noProviders")}</p>
            )}
            <div className="space-y-2">
              {providers.map((p) => (
                <Card
                  key={p.name}
                  className={`px-4 py-3 gap-2 cursor-pointer transition-colors ${
                    apiBase === p.api_base ? "ring-1 ring-primary/40" : ""
                  }`}
                  onClick={() => handleUseProvider(p)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        (p.models || []).length > 0 ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`} />
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.api_base}</span>
                    </div>
                    <Button size="xs" variant={apiBase === p.api_base ? "default" : "outline"} onClick={(e) => { e.stopPropagation(); handleUseProvider(p); }}>
                      <ArrowRight className="w-3 h-3 mr-1" />
                      {t("settings.use")}
                    </Button>
                  </div>
                  {(p.models || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.models.slice(0, 6).map((m) => (
                        <Badge key={m} variant="secondary" className="text-[11px] font-mono">{m}</Badge>
                      ))}
                      {p.models.length > 6 && (
                        <Badge variant="secondary" className="text-[11px]">+{p.models.length - 6}</Badge>
                      )}
                    </div>
                  )}
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
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                API Base
              </label>
              <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://localhost:11434/v1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Key className="w-3 h-3" />
                API Key
              </label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t("settings.keyPlaceholder")} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Model
                </label>
                <Button variant="outline" size="xs" onClick={handleFetchModels} disabled={!apiBase || loadingModels}>
                  {loadingModels ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                  {t("settings.fetchModels")}
                </Button>
              </div>
              {fetchStatus && (
                <p className={`text-[11px] mb-1.5 ${models.length > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {fetchStatus}
                </p>
              )}
              {models.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
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
              )}
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="qwen2.5:7b / gpt-4o / ..." />
            </div>
          </section>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSaveLLM} disabled={saving || !apiBase || !model}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
