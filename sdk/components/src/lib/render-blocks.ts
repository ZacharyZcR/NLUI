export type RenderHint = "table" | "kv" | "badges";

export type Block =
  | { type: "markdown"; content: string }
  | { type: "render"; hint: RenderHint; data: string };

const FENCE_RE = /```nlui:(table|kv|badges)\n([\s\S]*?)```/g;

export function splitRenderBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let last = 0;

  for (const m of content.matchAll(FENCE_RE)) {
    const idx = m.index!;
    if (idx > last) {
      blocks.push({ type: "markdown", content: content.slice(last, idx) });
    }
    blocks.push({
      type: "render",
      hint: m[1] as RenderHint,
      data: m[2],
    });
    last = idx + m[0].length;
  }

  if (last < content.length) {
    blocks.push({ type: "markdown", content: content.slice(last) });
  }

  return blocks.length > 0 ? blocks : [{ type: "markdown", content }];
}
