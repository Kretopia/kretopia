import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { BRAND } from "@/lib/brandLexicon";
import { streamCopilot, loadCopilotHistory, extractActions, type CopilotMessage } from "@/lib/thriveCopilot";

// Strip <action>/<plan> tags from the live-streaming buffer, same approach
// already proven in ThriveAgentFab.tsx — remove fully-closed tags, then hide
// any half-streamed opening tag and everything after it so partial JSON/XML
// never flashes on screen mid-stream.
function stripTagsLive(raw: string): string {
  let out = raw
    .replace(/<action>[\s\S]*?<\/action>/g, "")
    .replace(/<plan>[\s\S]*?<\/plan>/g, "");
  const openIdx = Math.min(
    ...["<action", "<plan"].map((t) => {
      const i = out.indexOf(t);
      return i === -1 ? Infinity : i;
    }),
  );
  if (openIdx !== Infinity) out = out.slice(0, openIdx);
  return out;
}

/**
 * Inline Kreto thread — the chat lives on the page itself, not in the floating
 * bubble. Streams the first token straight into the thread so replies feel
 * instant, and keeps the composer pinned under the conversation.
 */
export function InlineKretoChat({ seedPrompt }: { seedPrompt?: string | null }) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Rehydrate the persisted conversation on mount — the server already
  // saves every turn to ai_messages, this page just never asked for it
  // back, so refreshing silently lost the visible thread.
  useEffect(() => {
    let cancelled = false;
    loadCopilotHistory()
      .then((rows) => {
        if (cancelled) return;
        if (rows.length > 0) setMessages(rows);
      })
      .catch((e) => console.error("InlineKretoChat history load failed:", e))
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Strip <action>/<plan> tags live so raw JSON/XML never renders in the
    // bubble, even mid-stream — matches ThriveAgentFab's stripTagsLive.
    let assistantSoFar = "";
    const appendDelta = (delta: string) => {
      assistantSoFar += delta;
      const visible = stripTagsLive(assistantSoFar);
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, content: visible };
        return next;
      });
    };

    try {
      await streamCopilot({
        messages: [{ role: "user", content: text }],
        surface: "home",
        conversationId: conversationRef.current,
        onConversationId: (id) => { conversationRef.current = id; },
        onDelta: appendDelta,
        onDone: () => {},
        onError: (err) =>
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last?.role === "assistant" && !last.content) next[next.length - 1] = { ...last, content: err };
            return next;
          }),
        signal: controller.signal,
      });

      // The model proposed an action/plan (tags were stripped from the
      // visible text above). This page has no approval-card UI yet — never
      // pretend the action happened; point the user at the surface that
      // actually can execute and approve it.
      const { actions, plans } = extractActions(assistantSoFar);
      if (actions.length > 0 || plans.length > 0) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "I've got a suggested action ready — open the full Copilot (bottom nav) to review and approve it.",
          },
        ]);
      }
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) {
        console.error("InlineKretoChat stream failed:", e);
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && !last.content) {
            next[next.length - 1] = { ...last, content: "Something went wrong on my end. Try again?" };
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [streaming]);

  // A quick-action click seeds the thread and sends immediately.
  useEffect(() => {
    if (seedPrompt) send(seedPrompt).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPrompt]);

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="rounded-2xl border border-[hsl(var(--energy)/0.3)] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      {!historyLoaded && messages.length === 0 && (
        <div className="px-4 py-4 text-xs text-white/40 flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading your conversation…
        </div>
      )}
      {messages.length > 0 && (
        <div className="max-h-[46vh] overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[hsl(var(--energy)/0.15)] border border-[hsl(var(--energy)/0.25)] px-3.5 py-2 text-sm text-white"
                  : "mr-auto max-w-[92%] rounded-2xl rounded-bl-sm bg-white/[0.05] border border-white/10 px-3.5 py-2 text-sm text-white/90 whitespace-pre-wrap"
              }
            >
              {m.content || (
                <span className="inline-flex items-center gap-1.5 text-white/50">
                  <Loader2 className="h-3 w-3 animate-spin" /> {BRAND.agentName} is thinking…
                </span>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input).catch((err) => console.error(err)); }}
        className="flex items-end gap-2 border-t border-white/10 bg-white/[0.02] p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input).catch((err) => console.error(err));
            }
          }}
          rows={1}
          placeholder={`Ask ${BRAND.agentName} anything…`}
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/40 outline-none py-2 max-h-32"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="h-9 w-9 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center"
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-glass btn-glass-primary h-9 w-9 shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

export default InlineKretoChat;
