export interface Message {
  id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolArgs?: string;
  timestamp: Date;
  ephemeral?: boolean;
}
