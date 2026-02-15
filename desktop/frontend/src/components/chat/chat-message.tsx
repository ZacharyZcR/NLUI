import { useState } from "react";
import { ChevronDown, ChevronRight, Check, Copy, Edit2, Trash2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MdPreview } from "md-editor-rt";
import "md-editor-rt/lib/preview.css";
import { useI18n } from "@/lib/i18n";
import type { Message } from "@/lib/types";
import { splitRenderBlocks } from "@/lib/render-blocks";
import { RichResult } from "./renderers/rich-result";

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

export function ChatMessage({ message, isLast, onEdit, onDelete, onRetry }: ChatMessageProps) {
  if (message.role === "user") {
    return <UserMessage content={message.content} onEdit={onEdit} onDelete={onDelete} />;
  }

  if (message.role === "tool_call") {
    return <ToolCallMessage name={message.toolName} args={message.toolArgs} />;
  }

  if (message.role === "tool_result") {
    return <ToolResultMessage name={message.toolName} content={message.content} />;
  }

  return <AssistantMessage content={message.content} isLast={isLast} onRetry={onRetry} onDelete={onDelete} />;
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

/* ── User ── */
function UserMessage({ content, onEdit, onDelete }: { content: string; onEdit?: (newContent: string) => void; onDelete?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleSave = () => {
    if (editValue.trim() && onEdit) {
      onEdit(editValue.trim());
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(content);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 shadow-sm space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[60px] text-sm"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="xs" variant="outline" onClick={handleCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
            <Button size="xs" onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" />
              Save & Regenerate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end group/user">
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm relative">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/user:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-destructive/80 backdrop-blur-sm"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(content);
            }}
            className="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Assistant ── */
function AssistantMessage({ content, isLast, onRetry, onDelete }: { content: string; isLast?: boolean; onRetry?: () => void; onDelete?: () => void }) {
  const { theme } = useI18n();
  const blocks = splitRenderBlocks(content);
  const hasRenderBlocks = blocks.length > 1 || blocks[0]?.type === "render";

  if (!hasRenderBlocks) {
    return (
      <div className="flex justify-start group/assistant">
        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden relative">
          <MdPreview
            modelValue={content}
            theme={theme}
            previewTheme="github"
            codeTheme="github"
            language="en-US"
            className="kelper-md"
          />
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/assistant:opacity-100 transition-opacity flex gap-1">
            {isLast && onRetry && (
              <button
                onClick={onRetry}
                className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
                title="Retry"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-destructive/80 text-muted-foreground hover:text-foreground"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(content);
              }}
              className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start group/assistant">
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden relative space-y-2">
        {blocks.map((block, i) =>
          block.type === "markdown" ? (
            <MdPreview
              key={i}
              modelValue={block.content}
              theme={theme}
              previewTheme="github"
              codeTheme="github"
              language="en-US"
              className="kelper-md"
            />
          ) : (
            <RichResult key={i} raw={block.data} forceType={block.hint} />
          )
        )}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/assistant:opacity-100 transition-opacity flex gap-1">
          {isLast && onRetry && (
            <button
              onClick={onRetry}
              className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
              title="Retry"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-destructive/80 text-muted-foreground hover:text-foreground"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(content);
            }}
            className="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
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
      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
