// Telegram webhook — receives updates, links chat_id to user_id via /start <token>,
// and replies to text messages using Lovable AI on behalf of the linked user.
//
// SECURITY: validates Telegram's secret_token header (derived deterministically from
// TELEGRAM_API_KEY) before processing. No JWT — Telegram doesn't send one.
import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_GATEWAY = "https://connector-gateway.lovable.dev/telegram";
const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function deriveWebhookSecret(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${apiKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function tg(
  method: string,
  payload: Record<string, unknown>,
  lovableKey: string,
  tgKey: string,
) {
  const r = await fetch(`${TELEGRAM_GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error(`tg ${method} failed`, r.status, await r.text());
  return r;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!TELEGRAM_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE) {
    return new Response("server_misconfigured", { status: 500 });
  }

  // --- Verify Telegram's secret header ---
  const expected = await deriveWebhookSecret(TELEGRAM_API_KEY);
  const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(got, expected)) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  let update: any;
  try { update = await req.json(); } catch { return new Response("bad_json", { status: 400 }); }

  const msg = update.message ?? update.edited_message;
  const chatId: number | undefined = msg?.chat?.id;
  const text: string = (msg?.text ?? "").trim();
  const updateId: number | undefined = update.update_id;
  const tgUserId: number | undefined = msg?.from?.id;
  const tgUsername: string | undefined = msg?.from?.username;
  const tgDisplay: string | undefined =
    [msg?.from?.first_name, msg?.from?.last_name].filter(Boolean).join(" ") || tgUsername;

  if (!chatId || typeof updateId !== "number") {
    return new Response(JSON.stringify({ ok: true, ignored: true }));
  }

  // --- Resolve chat_id -> user_id (server-side, never trusting Telegram for identity) ---
  let resolvedUserId: string | null = null;
  const { data: existingLink } = await admin
    .from("messaging_channels")
    .select("user_id")
    .eq("channel", "telegram")
    .eq("external_chat_id", String(chatId))
    .eq("is_active", true)
    .maybeSingle();
  if (existingLink) resolvedUserId = existingLink.user_id;

  // --- Idempotent log ---
  await admin.from("telegram_messages").upsert({
    update_id: updateId,
    chat_id: chatId,
    telegram_user_id: tgUserId ?? null,
    user_id: resolvedUserId,
    text: msg?.text ?? null,
    raw_update: update,
  }, { onConflict: "update_id" });

  // --- /start <token> => link this chat to the user ---
  const startMatch = text.match(/^\/start(?:\s+(\S+))?$/);
  if (startMatch) {
    const token = startMatch[1];
    if (!token) {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "👋 Hey, I'm Thrive — your creative copilot.\n\n" +
          "To link this chat to your ThriveIN account, open the app → Settings → Connect Telegram.",
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    const { data: tokenRow } = await admin
      .from("telegram_link_tokens")
      .select("token, user_id, expires_at, consumed_at")
      .eq("token", token)
      .maybeSingle();

    const expired = !tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now();
    const used = tokenRow?.consumed_at != null;

    if (!tokenRow || expired || used) {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "⚠️ That link is invalid or expired.\n\n" +
          "Open ThriveIN → Settings → Connect Telegram to get a fresh link.",
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    // Link!
    await admin.from("messaging_channels").upsert({
      user_id: tokenRow.user_id,
      channel: "telegram",
      external_chat_id: String(chatId),
      external_username: tgUsername ?? null,
      external_display_name: tgDisplay ?? null,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: "channel,external_chat_id" });

    await admin.from("telegram_link_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("token", token);

    // Backfill user_id on this update's log row
    await admin.from("telegram_messages")
      .update({ user_id: tokenRow.user_id })
      .eq("update_id", updateId);

    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("user_id", tokenRow.user_id).maybeSingle();
    const name = profile?.full_name?.split(" ")[0] ?? "there";

    await tg("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text:
        `✅ Linked! Hey ${name} — I'm Thrive.\n\n` +
        `Send me anything: a project update, a question, a voice note. ` +
        `I'll keep things moving on your Desk.\n\n` +
        `Try: <i>"What's my next move today?"</i>`,
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    return new Response(JSON.stringify({ ok: true, linked: true }));
  }

  // --- Not linked yet ---
  if (!resolvedUserId) {
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "👋 We're not linked yet.\n\n" +
        "Open ThriveIN → Settings → Connect Telegram to pair this chat with your account.",
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    return new Response(JSON.stringify({ ok: true, unlinked: true }));
  }

  // --- Linked: refresh last_seen, generate a reply ---
  await admin.from("messaging_channels")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("channel", "telegram")
    .eq("external_chat_id", String(chatId));

  if (!text) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "I can read text right now — voice notes coming soon. Send me a message?",
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    return new Response(JSON.stringify({ ok: true }));
  }

  // Show typing indicator
  await tg("sendChatAction", { chat_id: chatId, action: "typing" }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

  // Route through the REAL Thrive Copilot (thrive-ai-chat) so the user gets the
  // same context-aware, memory-loaded, anti-hallucination assistant they'd get
  // in-app. Internal call: service-role bearer + x-internal-user-id header.
  let reply = "Got it — I'll get back to you shortly.";
  try {
    const aiResp = await fetch(`${SUPABASE_URL}/functions/v1/thrive-ai-chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE}`,
        "x-internal-user-id": resolvedUserId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: text }],
        surface: "home",
        surface_context: { channel: "telegram" },
        persist: true,
        stream: false,
      }),
    });
    if (aiResp.ok) {
      const j = await aiResp.json();
      const raw = (j?.content ?? "").toString().trim();
      // Strip <action>/<plan> tags — Telegram has no approval UI yet.
      const cleaned = raw
        .replace(/<action>[\s\S]*?<\/action>/g, "")
        .replace(/<plan>[\s\S]*?<\/plan>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (cleaned) reply = cleaned;
    } else {
      console.error("thrive-ai-chat failed", aiResp.status, await aiResp.text());
    }
  } catch (e) {
    console.error("thrive-ai-chat call threw", e);
  }

  await tg("sendMessage", { chat_id: chatId, text: reply }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
  return new Response(JSON.stringify({ ok: true }));
});
