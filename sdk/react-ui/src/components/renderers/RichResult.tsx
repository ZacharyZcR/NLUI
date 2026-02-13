import { useState } from "react";
import { Braces, SquareDashedBottom } from "lucide-react";
import { detectShape } from "@/lib/detect-shape";
import type { RenderHint } from "@/lib/render-blocks";
import { DataTable } from "./DataTable";
import { KVCard } from "./KVCard";
import { BadgeList } from "./BadgeList";

interface RichResultProps {
  raw: string;
  forceType?: RenderHint;
}

export function RichResult({ raw, forceType }: RichResultProps) {
  const [showRaw, setShowRaw] = useState(false);
  const shape = detectShape(raw);
  const hasRich = shape.type !== "raw";

  if (!hasRich && !forceType) {
    return <RawView text={raw} />;
  }

  return (
    <div className="relative">
      {hasRich && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowRaw(!showRaw); }}
          className="absolute top-0 right-0 z-10 p-1 rounded text-muted-foreground hover:text-foreground bg-muted/70 hover:bg-muted transition-colors"
          title={showRaw ? "Rich view" : "Raw JSON"}
        >
          {showRaw ? <SquareDashedBottom className="w-3 h-3" /> : <Braces className="w-3 h-3" />}
        </button>
      )}
      {showRaw ? (
        <RawView text={raw} />
      ) : (
        <ShapeRenderer raw={raw} shape={shape} forceType={forceType} />
      )}
    </div>
  );
}

function ShapeRenderer({
  raw,
  shape,
  forceType,
}: {
  raw: string;
  shape: ReturnType<typeof detectShape>;
  forceType?: RenderHint;
}) {
  if (forceType) {
    const forced = detectShape(raw);
    if (forceType === "table" && (forced.type === "table" || forced.type === "wrapped-table")) {
      return (
        <DataTable
          columns={forced.columns}
          rows={forced.rows}
          meta={forced.type === "wrapped-table" ? forced.meta : undefined}
        />
      );
    }
    if (forceType === "kv" && forced.type === "kv") {
      return <KVCard entries={forced.entries} />;
    }
    if (forceType === "badges" && forced.type === "list") {
      return <BadgeList items={forced.items} />;
    }
  }

  switch (shape.type) {
    case "table":
      return <DataTable columns={shape.columns} rows={shape.rows} />;
    case "wrapped-table":
      return <DataTable columns={shape.columns} rows={shape.rows} meta={shape.meta} />;
    case "kv":
      return <KVCard entries={shape.entries} />;
    case "list":
      return <BadgeList items={shape.items} />;
    default:
      return <RawView text={raw} />;
  }
}

function RawView({ text }: { text: string }) {
  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    formatted = text;
  }
  return (
    <pre className="text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
      {formatted}
    </pre>
  );
}
