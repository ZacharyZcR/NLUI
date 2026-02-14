import { useState } from "react";
import { MdPreview } from "md-editor-rt";
import "md-editor-rt/lib/preview.css";
import { useI18n } from "@/lib/i18n";
import type { Message } from "@/lib/types";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end group">
        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm relative">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          <CopyBtn text={message.content} />
        </div>
      </div>
    );
  }

  if (message.role === "tool_call") {
    return <ToolCallMessage name={message.toolName} args={message.toolArgs} />;
  }

  if (message.role === "tool_result") {
    return <ToolResultMessage name={message.toolName} content={message.content} />;
  }

  return <AssistantMessage content={message.content} />;
}

/* ── tool_call ── */
function ToolCallMessage({ name, args }: { name?: string; args?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pl-2">
      <div
        className="border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3 py-1 cursor-pointer group/tool"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-amber-500 dark:text-amber-400 text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
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

/* ── tool_result ── */
function ToolResultMessage({ name, content }: { name?: string; content: string }) {
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
          <span className="text-emerald-500 dark:text-emerald-400 text-[10px]">{open ? "\u25BC" : "\u2713"}</span>
          <span className="font-mono font-medium text-foreground/70">{name}</span>
          <span className="text-muted-foreground/30 text-[10px]">{size}</span>
          {!open && (
            <span className="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
              {preview.replace(/\n/g, " ")}
            </span>
          )}
        </div>
        {open && (
          <div className="mt-1.5 relative group">
            <pre className="text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
              {formatJSON(content)}
            </pre>
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

/* ── Assistant ── */
function AssistantMessage({ content }: { content: string }) {
  const { theme } = useI18n();
  return (
    <div className="flex justify-start group">
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden relative">
        <MdPreview
          modelValue={content}
          theme={theme}
          previewTheme="github"
          codeTheme="github"
          language="en-US"
          className="kelper-md"
        />
        <CopyBtn text={content} />
      </div>
    </div>
  );
}

/* ── Copy button ── */
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
      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm text-[11px] text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? "\u2713" : "\u2398"}
    </button>
  );
}

/* ── Helpers ── */
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
