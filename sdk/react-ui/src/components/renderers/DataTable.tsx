import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/Table";
import { Badge } from "../ui/Badge";

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}

export function DataTable({ columns, rows, meta }: DataTableProps) {
  return (
    <div className="space-y-1.5">
      {meta && Object.keys(meta).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(meta).map(([k, v]) => (
            <Badge key={k} variant="outline" className="text-[10px] font-mono">
              {k}: {String(v)}
            </Badge>
          ))}
        </div>
      )}
      <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-mono text-[11px] whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col} className="text-[11px] font-mono">
                    <CellValue value={row[col]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/40 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="text-[10px]">
        {String(value)}
      </Badge>
    );
  }
  if (typeof value === "object") {
    const s = JSON.stringify(value);
    return (
      <span className="text-muted-foreground/60" title={s}>
        {s.length > 40 ? s.slice(0, 40) + "\u2026" : s}
      </span>
    );
  }
  return <>{String(value)}</>;
}
