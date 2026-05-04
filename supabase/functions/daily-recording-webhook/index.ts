// Daily.co webhook receiver.
// Daily fires `recording.ready-to-download` once a cloud recording has
// finished processing. We acknowledge fast (under 5s — Daily requirement)
// and hand off transcription to a background invocation of `transcribe-call`.
//
// Configure in Daily dashboard → Webhooks:
//   URL: https://<project>.functions.supabase.co/daily-recording-webhook
//   Events: recording.ready-to-download
//   (Optional) HMAC secret → set DAILY_WEBHOOK_HMAC_SECRET

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.text();
    const payload = JSON.parse(raw);
    const event = payload?.type ?? payload?.event ?? "";

    // Daily echoes a `test` event when you save the webhook in their dashboard.
    if (event === "test" || event === "ping") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only act on completed recordings.
    if (event !== "recording.ready-to-download" && event !== "recording.finished") {
      console.log("[daily-recording-webhook] ignoring event:", event);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = payload?.payload ?? payload?.data ?? payload;
    const roomName: string | undefined = data?.room_name ?? data?.room;
    const recordingId: string | undefined = data?.recording_id ?? data?.id;
    const downloadUrl: string | undefined = data?.download_link ?? data?.download_url;
    const duration: number | undefined = data?.duration;

    if (!roomName || !recordingId) {
      console.warn("[daily-recording-webhook] missing room_name or recording_id", data);
      return new Response(JSON.stringify({ ok: true, ignored: "missing fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Match the room_name back to one of our call tables.
    const callContext = await findCall(admin, roomName);
    if (!callContext) {
      console.warn("[daily-recording-webhook] no matching call for room", roomName);
      return new Response(JSON.stringify({ ok: true, ignored: "no matching call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert a pending transcript row — this is the user-facing breadcrumb.
    const { data: tRow, error: tErr } = await admin
      .from("call_transcripts")
      .insert({
        call_kind: callContext.kind,
        call_id: callContext.id,
        project_id: callContext.project_id ?? null,
        circle_id: callContext.circle_id ?? null,
        recording_id: recordingId,
        recording_url: downloadUrl ?? null,
        duration_seconds: duration ?? null,
        participants: callContext.participants ?? [],
        status: "pending",
        created_by: callContext.host_id,
      })
      .select("id")
      .single();

    if (tErr) {
      console.error("[daily-recording-webhook] insert transcript failed", tErr);
      throw tErr;
    }

    // Fire-and-forget the heavy transcription job. We respond to Daily fast.
    const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/transcribe-call`;
    fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ transcript_id: tRow.id, recording_id: recordingId }),
    }).catch((e) => console.warn("[daily-recording-webhook] kickoff failed", e));

    return new Response(JSON.stringify({ ok: true, transcript_id: tRow.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[daily-recording-webhook] error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function findCall(admin: any, roomName: string): Promise<{
  kind: "project" | "direct" | "circle";
  id: string;
  host_id: string;
  project_id?: string;
  circle_id?: string;
  participants?: any[];
} | null> {
  // Project rooms are named `td-<projectIdNoDash>`. The video_room_url on the
  // project ends with the room_name, so we can search by URL suffix.
  const { data: pCall } = await admin
    .from("project_video_calls")
    .select("id, project_id, started_by, participants, room_url")
    .ilike("room_url", `%/${roomName}`)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pCall) {
    return {
      kind: "project",
      id: pCall.id,
      host_id: pCall.started_by,
      project_id: pCall.project_id,
      participants: pCall.participants,
    };
  }

  const { data: dCall } = await admin
    .from("direct_video_calls")
    .select("id, started_by, invited_user_id, participants, room_name, room_url")
    .or(`room_name.eq.${roomName},room_url.ilike.%/${roomName}`)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dCall) {
    return {
      kind: "direct",
      id: dCall.id,
      host_id: dCall.started_by,
      participants: dCall.participants,
    };
  }

  const { data: cCall } = await admin
    .from("circle_video_calls")
    .select("id, circle_id, started_by, participants, room_name, room_url")
    .or(`room_name.eq.${roomName},room_url.ilike.%/${roomName}`)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cCall) {
    return {
      kind: "circle",
      id: cCall.id,
      host_id: cCall.started_by,
      circle_id: cCall.circle_id,
      participants: cCall.participants,
    };
  }

  return null;
}
