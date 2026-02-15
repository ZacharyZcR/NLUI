import { useState } from "react";
import { ChevronDown, Check, Copy } from "lucide-react";
import { RichResult } from "../renderers/RichResult";

export interface ToolResultMessageProps {
  name?: string;
  content: string;
}

export function ToolResultMessage({ name, content }: ToolResultMessageProps) {
  const [open, setOpen] = useState(false);
  const preview = content.length > 100 ? content.slice(0, 100) + "\u2026" : content;
  const lines = content.split("\n").length;
  const size = content.length > 1024 ? `${(content.length / 1024).toFixed(1)}KB` : `${content.length}B`;

  return (
    <div className="pl-2">
      <div
        className="border-l-2 border-emerald-400/60 dark:border-emerald-500/40 pl-3 py-1 cursor-pointer group/tool"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {open ? (
            <ChevronDown className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
          )}
          <span className="font-mono font-medium text-foreground/70">{name}</span>
          <span className="text-muted-foreground/30 text-[10px]">{size}</span>
          {!open && (
            <span className="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
              {preview.replace(/\n/g, " ")}
            </span>
          )}
        </div>
        {open && (
          <div className="mt-1.5 relative group" onClick={(e) => e.stopPropagation()}>
            <RichResult raw={content} />
            <CopyBtn text={content} />
            {lines > 5 && (
              <span className="absolute bottom-1.5 right-1.5 text-[9px] text-muted-foreground/30 font-mono">
                {lines} lines
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
