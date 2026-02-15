export type DataShape =
  | { type: "table"; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "wrapped-table"; columns: string[]; rows: Record<string, unknown>[]; meta: Record<string, unknown> }
  | { type: "kv"; entries: [string, unknown][] }
  | { type: "list"; items: (string | number | boolean)[] }
  | { type: "raw"; text: string };

const MAX_COLS = 10;
const MAX_ROWS = 100;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPrimitive(v: unknown): v is string | number | boolean {
  const t = typeof v;
  return t === "string" || t === "number" || t === "boolean";
}

function extractColumns(rows: Record<string, unknown>[], limit: number): string[] {
  const seen = new Set<string>();
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    for (const k of Object.keys(rows[i])) seen.add(k);
  }
  return [...seen].slice(0, limit);
}

export function detectShape(raw: string): DataShape {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: "raw", text: raw };
  }

  // Array of objects → table
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isPlainObject)) {
    const rows = parsed.slice(0, MAX_ROWS) as Record<string, unknown>[];
    const columns = extractColumns(rows, MAX_COLS);
    return columns.length > 0
      ? { type: "table", columns, rows }
      : { type: "raw", text: raw };
  }

  // Array of primitives → list
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isPrimitive)) {
    return { type: "list", items: parsed as (string | number | boolean)[] };
  }

  // Plain object
  if (isPlainObject(parsed)) {
    // Check for wrapped-table: one top-level key is an object array
    const keys = Object.keys(parsed);
    for (const k of keys) {
      const v = parsed[k];
      if (Array.isArray(v) && v.length > 0 && v.every(isPlainObject)) {
        const rows = (v as Record<string, unknown>[]).slice(0, MAX_ROWS);
        const columns = extractColumns(rows, MAX_COLS);
        if (columns.length > 0) {
          const meta: Record<string, unknown> = {};
          for (const mk of keys) {
            if (mk !== k) meta[mk] = parsed[mk];
          }
          return { type: "wrapped-table", columns, rows, meta };
        }
      }
    }
    // Plain kv
    const entries = Object.entries(parsed) as [string, unknown][];
    return { type: "kv", entries };
  }

  return { type: "raw", text: raw };
}
