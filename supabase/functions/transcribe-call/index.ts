// Transcribes a Daily.co call recording with Gemini, summarizes it,
// extracts action items, and embeds chunks into the Thrive Brain.
//
// Trigger: invoked by `daily-recording-webhook` (background) with
//   { transcript_id, recording_id }
// Auth: service-role only (verify_jwt = false; we check the bearer token).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { embedText, toPgVector } from "../_shared/embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_API = "https://api.daily.co/v1";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role gate.
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let transcriptId: string | null = null;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { transcript_id, recording_id } = await req.json();
    transcriptId = transcript_id;
    if (!transcript_id || !recording_id) throw new Error("transcript_id and recording_id required");

    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!DAILY_API_KEY) throw new Error("DAILY_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    await admin.from("call_transcripts").update({ status: "transcribing" }).eq("id", transcript_id);

    // 1. Get a fresh download link (Daily access links expire ~120s).
    const linkRes = await fetch(`${DAILY_API}/recordings/${recording_id}/access-link`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (!linkRes.ok) throw new Error(`Daily access-link failed: ${linkRes.status}`);
    const { download_link } = await linkRes.json();
    if (!download_link) throw new Error("No download link from Daily");

    // 2. Download the recording (Daily records as MP4 with audio track).
    const audioRes = await fetch(download_link);
    if (!audioRes.ok) throw new Error(`Recording download failed: ${audioRes.status}`);
    const audioBuf = await audioRes.arrayBuffer();

    // Gemini accepts audio inputs up to ~20MB inline. For longer calls we'd
    // chunk, but most calls fit. Cap at 20MB to be safe.
    if (audioBuf.byteLength > 20 * 1024 * 1024) {
      throw new Error(`Recording too large for inline transcription (${audioBuf.byteLength} bytes). Chunking not yet implemented.`);
    }

    const base64Audio = bufferToBase64(audioBuf);

    // 3. Transcribe + summarize + extract action items in one Gemini call
    //    using tool calling for structured output.
    const aiRes = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Thrive Copilot's call analyst. Transcribe the audio verbatim, then summarize the key decisions, and extract every concrete action item (who, what, when). Be precise. Do not invent attendees or commitments. If a name is unclear, use 'Speaker 1', 'Speaker 2', etc.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe and analyze this call recording. Use the `record_call_analysis` tool with the full transcript, a 2-4 sentence summary, and structured action items.",
              },
              {
                type: "input_audio",
                input_audio: { data: base64Audio, format: "mp4" },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_call_analysis",
              description: "Store the verbatim transcript, summary, and action items from a call.",
              parameters: {
                type: "object",
                properties: {
                  language: { type: "string", description: "ISO 639-1 language code, e.g. 'en'" },
                  transcript: { type: "string", description: "Full verbatim transcript with speaker labels." },
                  summary: { type: "string", description: "2-4 sentence executive summary of the call." },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        kind: {
                          type: "string",
                          enum: ["task", "credit", "note", "followup", "decision"],
                          description: "task = someone needs to do something. credit = a creative contribution worth recording on ThriveIN. decision = a decision was made. followup = needs another conversation. note = important context.",
                        },
                        title: { type: "string", description: "Short, imperative phrasing for tasks (e.g. 'Send revised storyboard'). For decisions, the decision itself." },
                        detail: { type: "string", description: "Extra context, exact quote, or rationale." },
                        assignee_name: { type: "string", description: "Name of the person responsible, if stated." },
                        due_hint: { type: "string", description: "Free-form due date as said on the call (e.g. 'by Friday', 'next week')." },
                      },
                      required: ["kind", "title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["transcript", "summary", "action_items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "record_call_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("AI rate limited; will retry on next webhook.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      const t = await aiRes.text();
      throw new Error(`Gemini error ${aiRes.status}: ${t.slice(0, 300)}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("Gemini returned no tool call");

    const parsed = JSON.parse(toolCall.function.arguments) as {
      language?: string;
      transcript: string;
      summary: string;
      action_items: Array<{
        kind: string;
        title: string;
        detail?: string;
        assignee_name?: string;
        due_hint?: string;
      }>;
    };

    // 4. Save transcript + summary.
    await admin
      .from("call_transcripts")
      .update({
        transcript: parsed.transcript,
        summary: parsed.summary,
        language: parsed.language ?? null,
        status: "ready",
      })
      .eq("id", transcript_id);

    // 5. Insert action items.
    if (parsed.action_items?.length) {
      const rows = parsed.action_items.map((a) => ({
        transcript_id,
        kind: a.kind,
        title: a.title.slice(0, 500),
        detail: a.detail ?? null,
        assignee_name: a.assignee_name ?? null,
        // due_hint is intentionally not parsed to a real date — the user
        // confirms when accepting the item in the recap UI.
      }));
      const { error: aiErr } = await admin.from("call_action_items").insert(rows);
      if (aiErr) console.warn("[transcribe-call] action items insert failed", aiErr);
    }

    // 6. Embed into Thrive Brain (best-effort) for retrieval by the Copilot.
    const { data: tFull } = await admin
      .from("call_transcripts")
      .select("created_by, project_id, summary")
      .eq("id", transcript_id)
      .maybeSingle();

    if (tFull?.created_by && tFull.summary) {
      try {
        const vec = await embedText(`Call summary: ${tFull.summary}`);
        if (vec) {
          await admin.from("copilot_memories").insert({
            user_id: tFull.created_by,
            kind: "call_summary",
            content: tFull.summary,
            embedding: toPgVector(vec),
            source: "call_transcript",
            confidence: 0.9,
          });
        }
      } catch (e) {
        console.warn("[transcribe-call] memory embed failed", e);
      }
    }

    // 7. Distribute the brief (best-effort — never fail the transcript on this).
    try {
      await distributeBrief(admin, transcript_id, parsed);
    } catch (e) {
      console.warn("[transcribe-call] distribute failed", e);
    }

    return new Response(JSON.stringify({ ok: true, transcript_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[transcribe-call] error", e);
    if (transcriptId) {
      await admin
        .from("call_transcripts")
        .update({ status: "failed", error: e instanceof Error ? e.message : "Unknown" })
        .eq("id", transcriptId);
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

// ─────────────────────────────────────────────────────────────────────────
// Brief distribution: post to Circle chat, DM attendees their items,
// suggest a Studio to the host, surface on the linked Event.
// All steps are best-effort and isolated so one failure doesn't sink the rest.
// ─────────────────────────────────────────────────────────────────────────
type ParsedBrief = {
  language?: string;
  transcript: string;
  summary: string;
  action_items: Array<{
    kind: string;
    title: string;
    detail?: string;
    assignee_name?: string;
    due_hint?: string;
  }>;
};

async function distributeBrief(admin: any, transcriptId: string, parsed: ParsedBrief) {
  const { data: t } = await admin
    .from("call_transcripts")
    .select("id, call_kind, call_id, circle_id, project_id, created_by, participants, duration_seconds")
    .eq("id", transcriptId)
    .maybeSingle();
  if (!t) return;

  // Resolve linked event (if this came from a meeting tied to an event).
  let eventId: string | null = null;
  let eventTitle: string | null = null;
  if (t.call_kind === "meeting" || t.call_kind === "event") {
    const { data: mtg } = await admin
      .from("meetings")
      .select("event_id, circle_id, title")
      .eq("id", t.call_id)
      .maybeSingle();
    if (mtg?.event_id) eventId = mtg.event_id;
    if (mtg?.circle_id && !t.circle_id) {
      // Inherit circle from meeting if the transcript row didn't capture it.
      t.circle_id = mtg.circle_id;
    }
    if (mtg?.title) eventTitle = mtg.title;
  }
  if (eventId && !eventTitle) {
    const { data: ev } = await admin
      .from("creative_jams")
      .select("title, group_chat_room_id")
      .eq("id", eventId)
      .maybeSingle();
    eventTitle = ev?.title ?? null;
    // Event with a host-toggled group chat → post the brief there too.
    if (ev?.group_chat_room_id && !t.circle_id) t.circle_id = ev.group_chat_room_id;
  }

  // ── 1. Build the brief message body ──
  const tasks = (parsed.action_items ?? []).filter((a) => a.kind === "task" || a.kind === "followup");
  const decisions = (parsed.action_items ?? []).filter((a) => a.kind === "decision");
  const notes = (parsed.action_items ?? []).filter((a) => a.kind === "note");

  const lines: string[] = [];
  lines.push(eventTitle ? `📓 Call brief — ${eventTitle}` : "📓 Call brief");
  if (t.duration_seconds) lines.push(`Duration: ${Math.round(t.duration_seconds / 60)} min`);
  lines.push("");
  lines.push(parsed.summary);
  if (decisions.length) {
    lines.push("", "Decisions:");
    decisions.forEach((d) => lines.push(`• ${d.title}`));
  }
  if (tasks.length) {
    lines.push("", "Action items:");
    tasks.forEach((a) => {
      const who = a.assignee_name ? ` — ${a.assignee_name}` : "";
      const when = a.due_hint ? ` (${a.due_hint})` : "";
      lines.push(`• ${a.title}${who}${when}`);
    });
  }
  if (notes.length) {
    lines.push("", "Notes:");
    notes.forEach((n) => lines.push(`• ${n.title}`));
  }
  const body = lines.join("\n");

  // ── 2. Post into the Circle chat (spark_room_messages) if we have one ──
  if (t.circle_id) {
    const { error } = await admin.from("spark_room_messages").insert({
      room_id: t.circle_id,
      user_id: t.created_by,
      content: body,
      message_type: "text",
    });
    if (error) console.warn("[distribute] circle chat post failed", error);
  }

  // ── 3. Resolve attendee user_ids from participants jsonb ──
  const attendeeIds = new Set<string>();
  for (const p of (t.participants ?? []) as Array<{ user_id?: string }>) {
    if (p?.user_id && typeof p.user_id === "string") attendeeIds.add(p.user_id);
  }
  attendeeIds.add(t.created_by);

  // ── 4. Per-attendee notification (their own items if we can match by name) ──
  const recapUrl = t.circle_id
    ? `/circle/${t.circle_id}/chat`
    : eventId
      ? `/events/${eventId}`
      : `/inbox`;

  const notifRows: any[] = [];
  for (const uid of attendeeIds) {
    // Resolve name to match assignee_name (best-effort)
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", uid)
      .maybeSingle();
    const fullName = (prof?.full_name ?? "").trim().toLowerCase();

    const mine = (parsed.action_items ?? []).filter(
      (a) => a.assignee_name && fullName && a.assignee_name.toLowerCase().includes(fullName.split(" ")[0]),
    );

    const isHost = uid === t.created_by;
    notifRows.push({
      user_id: uid,
      type: "call_brief_ready",
      title: isHost ? "Your call brief is ready" : "Brief from your call is in",
      message: mine.length
        ? `You have ${mine.length} action item${mine.length > 1 ? "s" : ""} from "${eventTitle ?? "the call"}".`
        : `Quick recap + decisions from "${eventTitle ?? "the call"}".`,
      action_url: recapUrl,
      action_text: "Open brief",
      category: "calls",
      priority: mine.length ? "high" : "normal",
    });
  }
  if (notifRows.length) {
    const { error } = await admin.from("notifications").insert(notifRows);
    if (error) console.warn("[distribute] notifications failed", error);
  }

  // ── 5. Suggest a Studio (Desk project) to the host if collaborators were detected ──
  const collaboratorNames = Array.from(
    new Set(
      (parsed.action_items ?? [])
        .map((a) => a.assignee_name?.trim())
        .filter((n): n is string => !!n && n.length > 1),
    ),
  );
  if (collaboratorNames.length >= 2 && !t.project_id) {
    const studioParams = new URLSearchParams({
      from_transcript: transcriptId,
      title: eventTitle ?? "From the call",
      collaborators: collaboratorNames.slice(0, 8).join(","),
    });
    await admin.from("notifications").insert({
      user_id: t.created_by,
      type: "studio_suggestion",
      title: "Spin up a Studio from this call?",
      message: `Thrive detected ${collaboratorNames.length} collaborators: ${collaboratorNames.slice(0, 4).join(", ")}${collaboratorNames.length > 4 ? "…" : ""}`,
      action_url: `/desk/new?${studioParams.toString()}`,
      action_text: "Create Studio",
      category: "agent",
      priority: "high",
    });
  }
}

