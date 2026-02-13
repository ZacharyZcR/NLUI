import { Badge } from "@/components/ui/badge";
import { MdPreview } from "md-editor-rt";
import "md-editor-rt/lib/preview.css";
import { useI18n } from "@/lib/i18n";
import type { Message } from "@/lib/types";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === "tool_call") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-lg border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 text-[11px]">&#9881;</span>
            <Badge variant="outline" className="text-[11px] font-mono border-amber-500/25 text-amber-600 dark:text-amber-400 px-1.5 py-0">
              {message.toolName}
            </Badge>
          </div>
          {message.toolArgs && (
            <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {formatJSON(message.toolArgs)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (message.role === "tool_result") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-emerald-500 text-[11px]">&#10003;</span>
            <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-1.5 py-0">
              {message.toolName}
            </Badge>
          </div>
          <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
            {formatJSON(message.content)}
          </pre>
        </div>
      </div>
    );
  }

  // assistant — markdown
  return <AssistantMessage content={message.content} />;
}

function AssistantMessage({ content }: { content: string }) {
  const { theme } = useI18n();
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden">
        <MdPreview
          modelValue={content}
          theme={theme}
          previewTheme="github"
          codeTheme="github"
          language="en-US"
          className="kelper-md"
        />
      </div>
    </div>
  );
}

function formatJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
