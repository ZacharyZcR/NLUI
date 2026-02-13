import { Copy, Trash2, RotateCw } from "lucide-react";
import { MdPreview } from "md-editor-rt";
import "md-editor-rt/lib/preview.css";
import { useTheme } from "../theme/ThemeProvider";
import { splitRenderBlocks } from "@/lib/render-blocks";
import { RichResult } from "../renderers/RichResult";

export interface AssistantMessageProps {
  content: string;
  isLast?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
}

export function AssistantMessage({ content, isLast, onRetry, onDelete }: AssistantMessageProps) {
  const { theme } = useTheme();
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
            className="nlui-md"
          />
          <ActionButtons isLast={isLast} onRetry={onRetry} onDelete={onDelete} content={content} />
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
              className="nlui-md"
            />
          ) : (
            <RichResult key={i} raw={block.data} forceType={block.hint} />
          )
        )}
        <ActionButtons isLast={isLast} onRetry={onRetry} onDelete={onDelete} content={content} />
      </div>
    </div>
  );
}

function ActionButtons({
  isLast,
  onRetry,
  onDelete,
  content,
}: {
  isLast?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  content: string;
}) {
  return (
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
  );
}
