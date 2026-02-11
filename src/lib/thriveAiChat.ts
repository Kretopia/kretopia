import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/thrive-ai-chat`;

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  // Get the user's actual session token for personalization
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Request failed (${resp.status})`);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const json = line.slice(6).trim();
      if (json === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ") || raw.trim() === "" || raw.startsWith(":")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

// --- Chat persistence ---

export async function loadConversations() {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function loadMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

export async function createConversation(userId: string, title: string = "New Chat") {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveMessage(conversationId: string, role: "user" | "assistant", content: string) {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
  // Update conversation timestamp
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title })
    .eq("id", conversationId);
  if (error) throw error;
}

export async function deleteConversation(conversationId: string) {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}
