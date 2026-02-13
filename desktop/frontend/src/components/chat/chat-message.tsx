import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MdPreview } from "md-editor-rt";
import "md-editor-rt/lib/preview.css";
import type { Message } from "@/lib/types";

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === "tool_call") {
    return (
      <div className="flex justify-start">
        <Card className="max-w-[80%] border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-amber-500 text-xs">&#9881;</span>
            <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-600">
              {message.toolName}
            </Badge>
          </div>
          {message.toolArgs && (
            <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap">
              {formatJSON(message.toolArgs)}
            </pre>
          )}
        </Card>
      </div>
    );
  }

  if (message.role === "tool_result") {
    return (
      <div className="flex justify-start">
        <Card className="max-w-[80%] border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-emerald-500 text-xs">&#10003;</span>
            <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-600">
              {message.toolName}
            </Badge>
          </div>
          <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
            {formatJSON(message.content)}
          </pre>
        </Card>
      </div>
    );
  }

  // assistant — markdown rendering
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 overflow-hidden">
        <MdPreview
          modelValue={message.content}
          theme="dark"
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
