import { Badge } from "../ui/Badge";

const MAX_ITEMS = 50;

interface BadgeListProps {
  items: (string | number | boolean)[];
}

export function BadgeList({ items }: BadgeListProps) {
  const visible = items.slice(0, MAX_ITEMS);
  const overflow = items.length - MAX_ITEMS;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-[11px] font-mono">
          {String(item)}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          +{overflow} more
        </Badge>
      )}
    </div>
  );
}
