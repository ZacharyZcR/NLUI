const API_BASE = process.env.NEXT_PUBLIC_NLUI_URL || "http://localhost:9000";

export interface ChatEvent {
  type: "tool_call" | "tool_result" | "content" | "error" | "done";
  data: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function chatStream(
  message: string,
  conversationId: string | null,
  authToken: string,
  onEvent: (event: ChatEvent) => void
): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId || "",
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`API error: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ") && eventType) {
        try {
          const data = JSON.parse(line.slice(6));
          onEvent({ type: eventType as ChatEvent["type"], data });
        } catch {
          // skip malformed data
        }
        eventType = "";
      }
    }
  }
}

export async function listConversations(): Promise<Conversation[]> {
  const resp = await fetch(`${API_BASE}/api/conversations`);
  if (!resp.ok) return [];
  return resp.json();
}

export async function createConversation(
  title: string
): Promise<Conversation> {
  const resp = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return resp.json();
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/conversations/${id}`, { method: "DELETE" });
}

export async function getHealth(): Promise<{
  status: string;
  tools: number;
}> {
  const resp = await fetch(`${API_BASE}/api/health`);
  return resp.json();
}
