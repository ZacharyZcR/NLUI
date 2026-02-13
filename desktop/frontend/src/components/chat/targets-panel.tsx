import { useCallback, useEffect, useState } from "react";
import { Search, Upload, Plus, Trash2, Globe, Tag, FileText, Lock, CheckCircle, AlertCircle, Loader2, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useI18n } from "@/lib/i18n";
import {
  ProbeTarget,
  UploadSpec,
  UploadToolSet,
  ListTargets,
  AddTarget,
  UpdateTarget,
  RemoveTarget,
} from "../../../wailsjs/go/main/App";

interface TargetInfo {
  name: string;
  base_url: string;
  spec: string;
  auth_type: string;
  auth_header_name: string;
  has_token: boolean;
  description: string;
  tools: number;
}

interface ProbeResult {
  found: boolean;
  spec_url?: string;
  tools_path?: string;
  tools?: number;
  endpoints?: string[];
  auth_type?: string;
  auth_name?: string;
  error?: string;
}

interface TargetsPanelProps {
  onClose: () => void;
}

export function TargetsPanel({ onClose }: TargetsPanelProps) {
  const { t } = useI18n();

  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [tgtName, setTgtName] = useState("");
  const [tgtURL, setTgtURL] = useState("");
  const [tgtSpec, setTgtSpec] = useState("");
  const [tgtTools, setTgtTools] = useState("");
  const [tgtAuthType, setTgtAuthType] = useState("");
  const [tgtAuthHeader, setTgtAuthHeader] = useState("");
  const [tgtAuthToken, setTgtAuthToken] = useState("");
  const [tgtDesc, setTgtDesc] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tgtError, setTgtError] = useState("");

  // Edit state
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editURL, setEditURL] = useState("");
  const [editAuthType, setEditAuthType] = useState("");
  const [editAuthHeader, setEditAuthHeader] = useState("");
  const [editAuthToken, setEditAuthToken] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState("");

  const refreshTargets = useCallback(async () => {
    try {
      const result = await ListTargets();
      setTargets((result as TargetInfo[]) || []);
    } catch {
      setTargets([]);
    }
  }, []);

  useEffect(() => {
    refreshTargets();
  }, [refreshTargets]);

  const handleProbeTarget = async () => {
    if (!tgtURL) return;
    setProbing(true);
    setProbeResult(null);
    setTgtError("");
    try {
      const result = (await ProbeTarget(tgtURL)) as ProbeResult;
      setProbeResult(result);
      if (result.found && result.spec_url) setTgtSpec(result.spec_url);
      if (result.found && result.auth_type) {
        setTgtAuthType(result.auth_type);
        if (result.auth_name) setTgtAuthHeader(result.auth_name);
      }
    } catch (e) {
      setTgtError(e instanceof Error ? e.message : "probe failed");
    }
    setProbing(false);
  };

  const handleUploadSpec = async () => {
    setProbing(true);
    setProbeResult(null);
    setTgtError("");
    try {
      const result = (await UploadSpec()) as ProbeResult;
      setProbeResult(result);
      if (result.found && result.spec_url) setTgtSpec(result.spec_url);
      if (result.found && result.auth_type) {
        setTgtAuthType(result.auth_type);
        if (result.auth_name) setTgtAuthHeader(result.auth_name);
      }
    } catch (e) {
      setTgtError(e instanceof Error ? e.message : "upload failed");
    }
    setProbing(false);
  };

  const handleUploadToolSet = async () => {
    setProbing(true);
    setProbeResult(null);
    setTgtError("");
    try {
      const result = (await UploadToolSet()) as ProbeResult;
      setProbeResult(result);
      if (result.found && result.tools_path) setTgtTools(result.tools_path);
    } catch (e) {
      setTgtError(e instanceof Error ? e.message : "upload failed");
    }
    setProbing(false);
  };

  const handleAddTarget = async () => {
    if (!tgtName || (!tgtURL && !tgtSpec && !tgtTools)) {
      setTgtError(t("targets.nameUrlRequired"));
      return;
    }
    setTgtError("");
    const result = await AddTarget(tgtName, tgtURL, tgtSpec, tgtTools, tgtAuthType, tgtAuthHeader, tgtAuthToken, tgtDesc);
    if (result) {
      setTgtError(result);
    } else {
      setTgtName("");
      setTgtURL("");
      setTgtSpec("");
      setTgtTools("");
      setTgtAuthType("");
      setTgtAuthHeader("");
      setTgtAuthToken("");
      setTgtDesc("");
      setProbeResult(null);
      refreshTargets();
    }
  };

  const handleRemoveTarget = async (name: string) => {
    await RemoveTarget(name);
    refreshTargets();
  };

  const startEdit = (tgt: TargetInfo) => {
    setEditingTarget(tgt.name);
    setEditURL(tgt.base_url);
    setEditAuthType(tgt.auth_type);
    setEditAuthHeader(tgt.auth_header_name);
    setEditAuthToken("");
    setEditDesc(tgt.description);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingTarget(null);
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editingTarget) return;
    setEditError("");
    const result = await UpdateTarget(editingTarget, editURL, editAuthType, editAuthHeader, editAuthToken, editDesc);
    if (result) {
      setEditError(result);
    } else {
      setEditingTarget(null);
      refreshTargets();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5">
        <div className="max-w-none sm:max-w-lg mx-auto space-y-5">

          {/* Existing targets */}
          {targets.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                {t("targets.section")}
              </h3>
              {targets.map((tgt) => (
                <Card key={tgt.name} className="px-4 py-3 gap-1">
                  {editingTarget === tgt.name ? (
                    /* Edit mode */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tgt.name}</span>
                        <Button size="xs" variant="ghost" onClick={cancelEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Base URL
                        </label>
                        <Input value={editURL} onChange={(e) => setEditURL(e.target.value)} />
                      </div>
                      <AuthFields
                        authType={editAuthType} onAuthTypeChange={setEditAuthType}
                        headerName={editAuthHeader} onHeaderNameChange={setEditAuthHeader}
                        token={editAuthToken} onTokenChange={setEditAuthToken}
                        tokenPlaceholder={tgt.has_token ? "(unchanged)" : ""}
                      />
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {t("targets.description")}
                        </label>
                        <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                      </div>
                      {editError && <p className="text-xs text-destructive">{editError}</p>}
                      <Button size="sm" className="w-full" onClick={handleSaveEdit}>
                        <Save className="w-3.5 h-3.5 mr-1.5" /> {t("targets.save")}
                      </Button>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{tgt.name}</span>
                          {tgt.tools > 0 && (
                            <Badge variant="secondary" className="text-[11px]">{tgt.tools} tools</Badge>
                          )}
                          {tgt.auth_type && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              {(tgt.auth_type === "header" || tgt.auth_type === "query") ? tgt.auth_header_name : tgt.auth_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="xs" variant="ghost" className="text-xs" onClick={() => startEdit(tgt)}>
                            <Pencil className="w-3 h-3 mr-1" />
                            {t("targets.edit")}
                          </Button>
                          <Button size="xs" variant="ghost" className="text-destructive/70 hover:text-destructive text-xs" onClick={() => handleRemoveTarget(tgt.name)}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            {t("targets.remove")}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{tgt.base_url}</div>
                      {tgt.spec && <div className="text-xs text-muted-foreground/60 font-mono truncate">{tgt.spec}</div>}
                      {tgt.description && <div className="text-xs text-muted-foreground/80">{tgt.description}</div>}
                    </>
                  )}
                </Card>
              ))}
            </section>
          ) : (
            <p className="text-xs text-muted-foreground/50 py-6 text-center">{t("targets.empty")}</p>
          )}

          {/* Add target form */}
          <section className="space-y-3 border rounded-xl p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("targets.add")}
            </h3>

            {/* URL + Probe */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {t("targets.baseUrl")}
              </label>
              <div className="flex gap-2">
                <Input value={tgtURL} onChange={(e) => setTgtURL(e.target.value)} placeholder="http://localhost:8080" />
                <Button variant="outline" size="sm" onClick={handleProbeTarget} disabled={!tgtURL || probing}>
                  {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
                  {t("targets.probe")}
                </Button>
              </div>
            </div>

            {/* Upload */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleUploadSpec} disabled={probing}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {t("targets.upload")}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleUploadToolSet} disabled={probing}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {t("targets.uploadToolSet")}
              </Button>
            </div>

            {/* Probe result */}
            {probeResult && (
              <div className={`text-xs rounded-lg p-3 ${probeResult.found ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                {probeResult.found ? (
                  <>
                    <div className="font-medium mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t("targets.found")} — {probeResult.tools} endpoints
                    </div>
                    <div className="font-mono text-[11px] opacity-70 mb-1">{probeResult.spec_url}</div>
                    {probeResult.auth_type && (
                      <div className="flex items-center gap-1.5 text-[11px] opacity-80 mb-1">
                        <Lock className="w-3 h-3" />
                        Auth: {probeResult.auth_type}{probeResult.auth_name ? ` (${probeResult.auth_name})` : ""}
                      </div>
                    )}
                    {probeResult.endpoints && probeResult.endpoints.length > 0 && (
                      <div className="max-h-28 overflow-y-auto space-y-0.5 mt-2">
                        {probeResult.endpoints.slice(0, 15).map((ep, i) => (
                          <div key={i} className="font-mono text-[11px] truncate opacity-80">{ep.replace("_probe__", "").replace("_upload__", "")}</div>
                        ))}
                        {probeResult.endpoints.length > 15 && (
                          <div className="opacity-50">...+{probeResult.endpoints.length - 15} more</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t("targets.notFound")}: {probeResult.error}
                  </span>
                )}
              </div>
            )}

            {/* Name + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {t("targets.name")}
                </label>
                <Input value={tgtName} onChange={(e) => setTgtName(e.target.value)} placeholder="my-backend" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {t("targets.description")}
                </label>
                <Input value={tgtDesc} onChange={(e) => setTgtDesc(e.target.value)} placeholder={t("targets.descPlaceholder")} />
              </div>
            </div>

            {/* Auth */}
            <AuthFields
              authType={tgtAuthType} onAuthTypeChange={setTgtAuthType}
              headerName={tgtAuthHeader} onHeaderNameChange={setTgtAuthHeader}
              token={tgtAuthToken} onTokenChange={setTgtAuthToken}
            />

            {tgtError && <p className="text-xs text-destructive">{tgtError}</p>}

            <Button variant="outline" className="w-full" onClick={handleAddTarget} disabled={!tgtName || (!tgtURL && !tgtSpec && !tgtTools)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("targets.addBtn")}
            </Button>
          </section>

        </div>
      </div>
    </div>
  );
}

function AuthFields({ authType, onAuthTypeChange, headerName, onHeaderNameChange, token, onTokenChange, tokenPlaceholder }: {
  authType: string;
  onAuthTypeChange: (v: string) => void;
  headerName: string;
  onHeaderNameChange: (v: string) => void;
  token: string;
  onTokenChange: (v: string) => void;
  tokenPlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Lock className="w-3 h-3" />
        Auth <span className="text-muted-foreground/50 ml-1">(optional)</span>
      </label>
      <div className="flex gap-2">
        {(["", "bearer", "header", "query"] as const).map((type) => (
          <Button
            key={type || "none"}
            size="xs"
            variant={authType === type ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => onAuthTypeChange(type)}
          >
            {type === "" ? "None" : type === "bearer" ? "Bearer" : type === "header" ? "Header" : "Query"}
          </Button>
        ))}
      </div>
      {(authType === "header" || authType === "query") && (
        <Input
          value={headerName}
          onChange={(e) => onHeaderNameChange(e.target.value)}
          placeholder={authType === "query" ? "appid" : "X-API-Key"}
          className="text-xs"
        />
      )}
      {authType && (
        <Input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder={tokenPlaceholder || (authType === "bearer" ? "Bearer token" : authType === "query" ? "Parameter value" : "Header value")}
          className="text-xs"
        />
      )}
    </div>
  );
}
