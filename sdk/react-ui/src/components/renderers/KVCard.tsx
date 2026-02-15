import { Card, CardContent } from "../ui/Card";

interface KVCardProps {
  entries: [string, unknown][];
}

export function KVCard({ entries }: KVCardProps) {
  return (
    <Card className="py-3 gap-0">
      <CardContent className="px-3">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {entries.map(([key, value]) => (
            <KVRow key={key} k={key} v={value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KVRow({ k, v }: { k: string; v: unknown }) {
  return (
    <>
      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{k}</span>
      <span className="text-[11px] font-mono break-all">
        <FormattedValue value={v} />
      </span>
    </>
  );
}

function FormattedValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/40 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-emerald-500" : "text-red-400"}>{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-500 dark:text-blue-400">{value}</span>;
  }
  if (typeof value === "object") {
    const s = JSON.stringify(value, null, 2);
    return (
      <pre className="whitespace-pre-wrap text-muted-foreground/70 bg-muted/50 rounded px-1.5 py-0.5 text-[10px]">
        {s.length > 200 ? s.slice(0, 200) + "\u2026" : s}
      </pre>
    );
  }
  return <>{String(value)}</>;
}
