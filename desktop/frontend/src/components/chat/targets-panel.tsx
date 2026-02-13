import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import {
  ProbeTarget,
  ListTargets,
  AddTarget,
  RemoveTarget,
} from "../../../wailsjs/go/main/App";

interface TargetInfo {
  name: string;
  base_url: string;
  spec: string;
  auth_type: string;
  description: string;
  tools: number;
}

interface ProbeResult {
  found: boolean;
  spec_url?: string;
  tools?: number;
  endpoints?: string[];
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
  const [tgtAuth, setTgtAuth] = useState("");
  const [tgtToken, setTgtToken] = useState("");
  const [tgtDesc, setTgtDesc] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tgtError, setTgtError] = useState("");

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
      if (result.found && result.spec_url) {
        setTgtSpec(result.spec_url);
      }
    } catch (e) {
      setTgtError(e instanceof Error ? e.message : "probe failed");
    }
    setProbing(false);
  };

  const handleAddTarget = async () => {
    if (!tgtName || !tgtURL) {
      setTgtError(t("targets.nameUrlRequired"));
      return;
    }
    setTgtError("");
    const result = await AddTarget(tgtName, tgtURL, tgtSpec, tgtAuth, tgtToken, tgtDesc);
    if (result) {
      setTgtError(result);
    } else {
      setTgtName("");
      setTgtURL("");
      setTgtSpec("");
      setTgtAuth("");
      setTgtToken("");
      setTgtDesc("");
      setProbeResult(null);
      refreshTargets();
    }
  };

  const handleRemoveTarget = async (name: string) => {
    await RemoveTarget(name);
    refreshTargets();
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-semibold">{t("targets.section")}</h2>
        <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
          {t("settings.close")}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Existing targets */}
          {targets.length > 0 && (
            <div className="space-y-2">
              {targets.map((tgt) => (
                <Card key={tgt.name} className="px-4 py-3 gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tgt.name}</span>
                      {tgt.tools > 0 && (
                        <Badge variant="secondary" className="text-xs">{tgt.tools} tools</Badge>
                      )}
                    </div>
                    <Button size="xs" variant="ghost" className="text-destructive text-xs" onClick={() => handleRemoveTarget(tgt.name)}>
                      {t("targets.remove")}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">{tgt.base_url}</div>
                  {tgt.spec && <div className="text-xs text-muted-foreground font-mono truncate">{tgt.spec}</div>}
                  {tgt.description && <div className="text-xs text-muted-foreground">{tgt.description}</div>}
                </Card>
              ))}
            </div>
          )}
          {targets.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 text-center">{t("targets.empty")}</p>
          )}

          {/* Add target */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="text-xs font-medium">{t("targets.add")}</h4>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("targets.baseUrl")}</label>
              <div className="flex gap-2">
                <Input value={tgtURL} onChange={(e) => setTgtURL(e.target.value)} placeholder="http://localhost:8080" />
                <Button variant="outline" size="sm" onClick={handleProbeTarget} disabled={!tgtURL || probing}>
                  {probing ? "..." : t("targets.probe")}
                </Button>
              </div>
            </div>

            {/* Probe result */}
            {probeResult && (
              <div className={`text-xs rounded-md p-3 ${probeResult.found ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                {probeResult.found ? (
                  <>
                    <div className="font-medium mb-1">
                      {t("targets.found")} — {probeResult.tools} endpoints
                    </div>
                    <div className="font-mono text-xs opacity-80 mb-1">{probeResult.spec_url}</div>
                    {probeResult.endpoints && probeResult.endpoints.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5 mt-2">
                        {probeResult.endpoints.slice(0, 15).map((ep, i) => (
                          <div key={i} className="font-mono truncate">{ep.replace("_probe__", "")}</div>
                        ))}
                        {(probeResult.endpoints.length) > 15 && (
                          <div className="opacity-60">...+{probeResult.endpoints.length - 15} more</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span>{t("targets.notFound")}: {probeResult.error}</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("targets.name")}</label>
                <Input value={tgtName} onChange={(e) => setTgtName(e.target.value)} placeholder="my-backend" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("targets.description")}</label>
                <Input value={tgtDesc} onChange={(e) => setTgtDesc(e.target.value)} placeholder={t("targets.descPlaceholder")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("targets.authType")}</label>
                <div className="flex gap-1.5">
                  {["", "bearer", "header"].map((at) => (
                    <Badge
                      key={at || "none"}
                      variant={tgtAuth === at ? "default" : "outline"}
                      className="text-xs cursor-pointer"
                      onClick={() => setTgtAuth(at)}
                    >
                      {at || "none"}
                    </Badge>
                  ))}
                </div>
              </div>
              {tgtAuth && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Token</label>
                  <Input type="password" value={tgtToken} onChange={(e) => setTgtToken(e.target.value)} placeholder="Bearer token" />
                </div>
              )}
            </div>

            {tgtError && <p className="text-xs text-destructive">{tgtError}</p>}

            <Button variant="outline" className="w-full" onClick={handleAddTarget} disabled={!tgtName || !tgtURL}>
              {t("targets.addBtn")}
            </Button>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
