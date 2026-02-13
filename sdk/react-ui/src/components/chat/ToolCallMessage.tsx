import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface ToolCallMessageProps {
  name?: string;
  args?: string;
}

export function ToolCallMessage({ name, args }: ToolCallMessageProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pl-2">
      <div
        className="border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3 py-1 cursor-pointer group/tool"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {open ? (
            <ChevronDown className="w-3 h-3 text-amber-500 dark:text-amber-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-amber-500 dark:text-amber-400" />
          )}
          <span className="font-mono font-medium text-foreground/70">{name}</span>
          {!open && args && (
            <span className="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
              {argPreview(args)}
            </span>
          )}
        </div>
        {open && args && (
          <pre className="mt-1.5 text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {formatJSON(args)}
          </pre>
        )}
      </div>
    </div>
  );
}

function argPreview(args: string): string {
  try {
    const obj = JSON.parse(args);
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    const parts = keys.slice(0, 3).map((k) => {
      const v = obj[k];
      const vs = typeof v === "string" ? (v.length > 20 ? v.slice(0, 20) + "\u2026" : v) : JSON.stringify(v);
      return `${k}: ${vs}`;
    });
    return `{ ${parts.join(", ")}${keys.length > 3 ? ", \u2026" : ""} }`;
  } catch {
    return args.length > 60 ? args.slice(0, 60) + "\u2026" : args;
  }
}

function formatJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
