import { useState } from "react";
import { Copy, Edit2, Trash2, X, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

export interface UserMessageProps {
  content: string;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

export function UserMessage({ content, onEdit, onDelete }: UserMessageProps) {
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
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
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
