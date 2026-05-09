# Make Thrive Voice fully working — and able to trigger every automation

## What's wrong today

1. **Last error (`429 not_authenticated`)** — fixed in `src/lib/thriveVoice.ts` by adding the `apikey` header. Edge logs are empty since the fix, so it has not been re-exercised end-to-end.
2. **Voice can talk, but it can't *do* anything.** `supabase/functions/thrive-voice-turn/index.ts` does STT → a plain Gemini reply → TTS. It never touches the tool-calling agent (`thrive-ai-chat`), so saying *"Find me a filmmaker in Trinidad"* or *"Draft a quote for Acme — $1,200"* just gets a spoken acknowledgement. No Talent Copilot opens, no quote drafted, no memory recalled, no proactive card injected. That breaks the promise we made when we built the Thrive Bar.

## Goal

One voice turn = one full agent turn. Every tool that text chat can call (`draft_invoice`, `draft_quote`, `start_video_call`, `find_talent`, `remember_memory`, `add_credit`, etc.) is reachable by speech, with the spoken reply matching what the agent actually did.

## Plan

### 1. Confirm the auth fix shipped

- Re-deploy `thrive-voice-turn` (idempotent), then `curl` it from the preview session to confirm a 200 with `{ ok, transcript, reply }`.
- Tail edge logs for one real recording from the UI to make sure no `missing_auth` / `429` slips through.
- Sanity-check the `consume_voice_seconds` RPC returns sane numbers for the current user's tier.

### 2. Split the voice turn into STT + Agent + TTS

Refactor so the brain is the existing agent, not a parallel Gemini call.

```text
client mic ──► thrive-voice-turn (STT only) ──► {transcript}
                                                  │
client ──► thrive-ai-chat (transcript, surface)  ─┴► {reply, tool_calls, proactive_cards}
                                                  │
client ──► thrive-voice-tts (reply text)         ─┴► {audio_base64}
client plays audio + renders tool cards / navigation just like text chat
```

Why split:
- `thrive-ai-chat` already owns the tool registry, daily caps, memory, and proactive-card pipeline. Reusing it means voice automatically inherits **every** current and future automation.
- Keeping STT and TTS as small dedicated functions lets us cache, retry, and rate-limit each independently, and makes browser-TTS fallback trivial.

Concrete changes:
- **`thrive-voice-turn`**: trim to STT-only. Still validates JWT, still calls `consume_voice_seconds`, still returns `transcript` + usage. No more brain / TTS / persistence here.
- **New `thrive-voice-tts`**: tiny function that takes `{ text, voice_id? }`, calls ElevenLabs, returns `{ audio_base64, tts_fallback }`. Same auth + CORS pattern.
- **`src/lib/thriveVoice.ts`**:
  - `stopAndSend()` → returns `{ transcript, usage }` only.
  - New `synthesizeReply(text)` → calls `thrive-voice-tts`, falls back to `speakBrowser()`.
- **`ThriveAgentFab.tsx`** `handleStopVoice`:
  1. `stopAndSend` → transcript.
  2. Push `🎙️ transcript` into the chat as the user message.
  3. Call the same `sendMessage()` path text chat already uses (so tool calls, proactive cards, navigation, surface context all run).
  4. Once the assistant reply lands, call `synthesizeReply(reply)` and play it (respect `voiceMuted`).
  5. If a tool call also produces a deep-link or workspace open (e.g. Talent Copilot results, Quote draft), the existing client handlers fire — voice just becomes another input modality.

### 3. Wire the surface-aware automations the user called out

These already exist as tools/handlers; we just need to make sure the agent's system prompt nudges them when the input is voice:
- *"Find me a filmmaker in Trinidad"* → `find_talent` tool → opens Match results / Talent Copilot drawer.
- *"Draft a quote for Acme, $1,200, due Friday"* → `draft_quote` tool (already registered via `desk-agent`).
- *"Remember my day rate is $1,500"* → `remember_memory`.
- *"Start a call with Sarah"* → `start_video_call`.

Add a short voice-mode hint to the system prompt when the request came from voice ("speak the result in 1–2 sentences, then let the UI handle the action").

### 4. QA pass across surfaces

For each surface (Home, Desk, Pay, Match, Gigs, Profile):
- Hold mic → speak a representative command → check
  - transcript appears in chat,
  - agent runs the right tool,
  - spoken reply plays (ElevenLabs or browser TTS),
  - daily-cap counters increment,
  - no duplicate fabs / no console errors.

### Technical notes

- Keep `consume_voice_seconds` in `thrive-voice-turn` (STT side) so the cap is enforced *before* we burn agent credits.
- `thrive-ai-chat` already persists into the canonical Copilot thread, so we drop the duplicate insert in `thrive-voice-turn`.
- ElevenLabs failures continue to set `tts_fallback: true` so the client uses `SpeechSynthesis`.
- No DB migrations required.
- Files touched: `supabase/functions/thrive-voice-turn/index.ts`, `supabase/functions/thrive-voice-tts/index.ts` (new), `src/lib/thriveVoice.ts`, `src/components/desk/ThriveAgentFab.tsx`. Possibly a small system-prompt tweak in `supabase/functions/thrive-ai-chat/index.ts` for `from_voice: true`.
