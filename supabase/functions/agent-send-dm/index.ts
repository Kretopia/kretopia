// agent-send-dm
// Lightweight handler invoked by the agent-orchestrator when a user approves a
// `send_dm` action. Inserts a row into public.messages as the authenticated user
// (RLS-safe via their JWT), so the recipient sees a normal direct message.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const senderId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const to_user_id = String(body.to_user_id ?? "").trim();
    const messageBody = String(body.body ?? "").trim();

    if (!to_user_id || !messageBody) {
      return new Response(
        JSON.stringify({ error: "to_user_id and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (to_user_id === senderId) {
      return new Response(
        JSON.stringify({ error: "Cannot DM yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (messageBody.length > 4000) {
      return new Response(
        JSON.stringify({ error: "Message too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted, error } = await userClient
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: to_user_id,
        content: messageBody,
        read: false,
      })
      .select("id")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort: notify recipient (push + email). Do not block.
    try {
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: senderProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", senderId)
        .maybeSingle();
      const senderName = senderProfile?.full_name ?? "Someone";
      const preview = messageBody.length > 80 ? messageBody.slice(0, 80) + "…" : messageBody;

      admin.functions.invoke("send-push-notification", {
        body: {
          userId: to_user_id,
          title: `${senderName} sent you a message`,
          body: preview,
          tag: "dm",
          data: { url: "/messages" },
        },
      }).catch(() => {});

      admin.functions.invoke("send-user-email", {
        body: { type: "message", recipientId: to_user_id, data: { messagePreview: preview } },
      }).catch(() => {});
    } catch {
      // ignore notification failures — message is already delivered
    }

    return new Response(
      JSON.stringify({ ok: true, message_id: inserted?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("agent-send-dm error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
