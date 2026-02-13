import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";

export interface LLMProvider {
  name: string;
  api_base: string;
  models: string[];
}

export interface SettingsClient {
  getLLMConfig(): Promise<{ api_base: string; api_key: string; model: string; stream?: boolean; language?: string }>;
  getProxyConfig(): Promise<{ proxy: string }>;
  updateLLMConfig(params: { api_base: string; api_key?: string; model?: string }): Promise<{ message: string }>;
  updateStream(stream: boolean): Promise<{ message: string }>;
  updateLanguage(language: string): Promise<{ message: string }>;
  updateProxyConfig(proxy: string): Promise<{ message: string }>;
  testProxy(proxy: string): Promise<unknown>;
  probeLLMProviders(): Promise<LLMProvider[]>;
  fetchModels(params: { api_base: string; api_key?: string }): Promise<string[]>;
}

export interface SettingsPanelProps {
  client: SettingsClient;
  onSaved?: () => void;
}

export function SettingsPanel({ client, onSaved }: SettingsPanelProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
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
      const result = await client.probeLLMProviders();
      setProviders(result || []);
    } catch {
      setProviders([]);
    }
    setScanning(false);
  }, [client]);

  useEffect(() => {
    scan();
    Promise.all([client.getLLMConfig(), client.getProxyConfig()]).then(
      ([llm, proxyConf]) => {
        setApiBase(llm.api_base || "");
        setApiKey(llm.api_key || "");
        setModel(llm.model || "");
        setPromptLang(llm.language || "en");
        setStream(llm.stream !== false);
        const p = proxyConf.proxy || "";
        setProxy(p);
        setProxySaved(p);
      }
    );
  }, [client, scan]);

  const handleSaveLanguage = async (lang: string) => {
    setPromptLang(lang);
    await client.updateLanguage(lang);
    onSaved?.();
  };

  const handleToggleStream = async (v: boolean) => {
    setStream(v);
    await client.updateStream(v);
    onSaved?.();
  };

  const handleSaveProxy = async () => {
    setSavingProxy(true);
    setError("");
    try {
      await client.updateProxyConfig(proxy);
      setProxySaved(proxy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    }
    setSavingProxy(false);
  };

  const handleTestProxy = async () => {
    setTestingProxy(true);
    setProxyTestResult("");
    try {
      await client.testProxy(proxy);
      setProxyTestResult("ok");
    } catch {
      setProxyTestResult("fail");
    }
    setTestingProxy(false);
  };

  const handleUseProvider = (p: LLMProvider) => {
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
      const result = await client.fetchModels({ api_base: apiBase, api_key: apiKey });
      const list = result || [];
      setModels(list);
      if (list.length > 0) {
        setModel(list[0]);
        setFetchStatus(`Found ${list.length} model(s)`);
      } else {
        setFetchStatus("No models found");
      }
    } catch {
      setModels([]);
      setFetchStatus("Failed to fetch models");
    }
    setLoadingModels(false);
  };

  const handleSaveLLM = async () => {
    if (!apiBase || !model) {
      setError("API Base and Model are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await client.updateLLMConfig({ api_base: apiBase, api_key: apiKey, model });
      onSaved?.();
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
              Prompt Language
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
            <p className="text-[11px] text-muted-foreground/60">Language used for system prompts and tool descriptions.</p>
          </section>

          {/* Stream toggle */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stream
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
                  {v ? "On" : "Off"}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">Enable streaming for real-time token output.</p>
          </section>

          {/* Proxy */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Proxy
            </h3>
            <div className="flex gap-2">
              <Input
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="http://127.0.0.1:7890"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveProxy}
                disabled={savingProxy || !proxyDirty}
              >
                {savingProxy ? "..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestProxy}
                disabled={testingProxy || !proxySaved}
              >
                {testingProxy ? "..." : "Test"}
              </Button>
            </div>
            {proxyTestResult && (
              <p className={`text-[11px] ${proxyTestResult === "ok" ? "text-emerald-500" : "text-destructive"}`}>
                {proxyTestResult === "ok" ? "Proxy is reachable" : "Proxy test failed"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/60">HTTP/SOCKS5 proxy for LLM API requests.</p>
          </section>

          {/* Detected Providers */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Detected Providers
              </h3>
              <Button variant="ghost" size="sm" onClick={scan} disabled={scanning} className="text-xs h-7">
                {scanning ? "Scanning..." : "Rescan"}
              </Button>
            </div>
            {providers.length === 0 && !scanning && (
              <p className="text-xs text-muted-foreground/50 py-4 text-center">No providers detected</p>
            )}
            <div className="space-y-2">
              {providers.map((p) => (
                <Card
                  key={p.name}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
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
                    <Button size="sm" variant={apiBase === p.api_base ? "default" : "outline"} className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handleUseProvider(p); }}>
                      Use →
                    </Button>
                  </div>
                  {(p.models || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
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

          {/* Manual Config */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Manual Configuration
            </h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                API Base
              </label>
              <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://localhost:11434/v1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                API Key
              </label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  Model
                </label>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleFetchModels} disabled={!apiBase || loadingModels}>
                  {loadingModels ? "Loading..." : "Fetch Models"}
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
            {saving ? "Saving..." : "Save LLM Config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
