// Telegram webhook — receives updates, links chat_id to user_id via /start <token>,
// replies via Thrive Copilot, surfaces orch_actions as inline-keyboard approval cards,
// and handles Approve / Edit / Dismiss callback_query taps.
//
// SECURITY: validates Telegram's secret_token header (derived deterministically from
// TELEGRAM_API_KEY) before processing. No JWT — Telegram doesn't send one.
import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

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

// ---------- helpers ----------

const ACTION_TAG_RE = /<action>\s*([\s\S]*?)\s*<\/action>/g;
const PLAN_TAG_RE = /<plan>\s*([\s\S]*?)\s*<\/plan>/g;

function extractActions(raw: string): {
  visible: string;
  actions: { intent: string; surface?: string }[];
  planCount: number;
} {
  const actions: { intent: string; surface?: string }[] = [];
  let planCount = 0;
  let visible = raw
    .replace(ACTION_TAG_RE, (_m, json) => {
      try {
        const p = JSON.parse(json);
        if (p && typeof p.intent === "string") actions.push(p);
      } catch { /* ignore */ }
      return "";
    })
    .replace(PLAN_TAG_RE, (_m, _json) => { planCount++; return ""; });
  visible = visible.replace(/\n{3,}/g, "\n\n").trim();
  return { visible, actions, planCount };
}

function approvalKeyboard(actionId: string) {
  return {
    inline_keyboard: [[
      { text: "✅ Approve", callback_data: `app:${actionId}` },
      { text: "✏️ Edit", callback_data: `edt:${actionId}` },
      { text: "✖️ Dismiss", callback_data: `dis:${actionId}` },
    ]],
  };
}

function approvalCardText(action: any): string {
  const title = action.preview_title ?? action.tool_name ?? "Proposed action";
  const body = action.preview_body ? `\n\n${action.preview_body}` : "";
  const risk = action.risk_level === "locked"
    ? " 🔒"
    : action.risk_level === "requires_approval"
      ? " ⚠️"
      : "";
  return `🤖 <b>${escapeHtml(title)}</b>${risk}${escapeHtml(body)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- main ----------

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

  // ============================================================
  // CALLBACK QUERY — Approve / Edit / Dismiss inline-keyboard taps
  // ============================================================
  if (update.callback_query) {
    const cq = update.callback_query;
    const cqId: string = cq.id;
    const data: string = cq.data ?? "";
    const chatId: number | undefined = cq.message?.chat?.id;
    const messageId: number | undefined = cq.message?.message_id;

    const ack = (text: string, alert = false) =>
      tg("answerCallbackQuery", { callback_query_id: cqId, text, show_alert: alert },
        LOVABLE_API_KEY, TELEGRAM_API_KEY);

    if (!chatId || !messageId) return new Response(JSON.stringify({ ok: true }));

    // Resolve which user owns this Telegram chat
    const { data: link } = await admin
      .from("messaging_channels")
      .select("user_id")
      .eq("channel", "telegram")
      .eq("external_chat_id", String(chatId))
      .eq("is_active", true)
      .maybeSingle();
    if (!link) {
      await ack("Not linked. Open ThriveIN → Settings → Connect Telegram.", true);
      return new Response(JSON.stringify({ ok: true }));
    }
    const userId = link.user_id as string;

    const [kind, actionId] = data.split(":");
    if (!actionId) {
      await ack("Invalid action.");
      return new Response(JSON.stringify({ ok: true }));
    }

    // Verify the action belongs to this user
    const { data: action } = await admin
      .from("orch_actions")
      .select("id, user_id, status, preview_title, tool_name")
      .eq("id", actionId)
      .maybeSingle();
    if (!action || action.user_id !== userId) {
      await ack("Action not found.", true);
      return new Response(JSON.stringify({ ok: true }));
    }
    if (action.status !== "proposed") {
      await ack(`Already ${action.status}.`);
      await tg("editMessageReplyMarkup", {
        chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] },
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    if (kind === "edt") {
      // MVP: dismiss + invite user to retry with corrections in chat.
      await admin.from("orch_actions").update({ status: "rejected" }).eq("id", actionId);
      await ack("Dismissed — tell me what to change.");
      await tg("editMessageText", {
        chat_id: chatId, message_id: messageId, parse_mode: "HTML",
        text: `✏️ <i>Dismissed for edit.</i>\nReply with what to change and I'll redraft "${escapeHtml(action.preview_title ?? action.tool_name ?? "this")}".`,
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    if (kind === "dis") {
      const orchResp = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE}`,
          "x-internal-user-id": userId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action_id: actionId, decision: "rejected" }),
      });
      await orchResp.text();
      await ack("Dismissed.");
      await tg("editMessageText", {
        chat_id: chatId, message_id: messageId, parse_mode: "HTML",
        text: `✖️ <s>${escapeHtml(action.preview_title ?? action.tool_name ?? "Action")}</s>\n<i>Dismissed.</i>`,
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    if (kind === "app") {
      await ack("Working on it…");
      // Show in-progress state immediately
      await tg("editMessageText", {
        chat_id: chatId, message_id: messageId, parse_mode: "HTML",
        text: `⏳ <b>${escapeHtml(action.preview_title ?? action.tool_name ?? "Running")}</b>\n<i>Approving…</i>`,
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

      const orchResp = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE}`,
          "x-internal-user-id": userId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action_id: actionId, decision: "approved" }),
      });
      const result = await orchResp.json().catch(() => ({}));
      const ok = orchResp.ok && result?.ok !== false;

      await tg("editMessageText", {
        chat_id: chatId, message_id: messageId, parse_mode: "HTML",
        text: ok
          ? `✅ <b>${escapeHtml(action.preview_title ?? action.tool_name ?? "Done")}</b>\n<i>Approved & executed.</i>`
          : `❌ <b>${escapeHtml(action.preview_title ?? action.tool_name ?? "Failed")}</b>\n<i>${escapeHtml(result?.error ?? "Couldn't run that.")}</i>`,
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

    await ack("Unknown action.");
    return new Response(JSON.stringify({ ok: true }));
  }

  // ============================================================
  // MESSAGE — text from user
  // ============================================================
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

  // --- Resolve chat_id -> user_id ---
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

  // --- /start <token> ---
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
        text: "⚠️ That link is invalid or expired.\n\nOpen ThriveIN → Settings → Connect Telegram to get a fresh link.",
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ ok: true }));
    }

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

    await admin.from("telegram_messages")
      .update({ user_id: tokenRow.user_id })
      .eq("update_id", updateId);

    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("user_id", tokenRow.user_id).maybeSingle();
    const name = profile?.full_name?.split(" ")[0] ?? "there";

    await tg("sendMessage", {
      chat_id: chatId, parse_mode: "HTML",
      text:
        `✅ Linked! Hey ${name} — I'm Thrive.\n\n` +
        `Send me anything: a project update, a question, a voice note. ` +
        `When I propose an action, you'll get Approve / Edit / Dismiss buttons right here.\n\n` +
        `Try: <i>"What's my next move today?"</i>`,
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    return new Response(JSON.stringify({ ok: true, linked: true }));
  }

  if (!resolvedUserId) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "👋 We're not linked yet.\n\nOpen ThriveIN → Settings → Connect Telegram to pair this chat with your account.",
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    return new Response(JSON.stringify({ ok: true, unlinked: true }));
  }

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

  await tg("sendChatAction", { chat_id: chatId, action: "typing" }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

  // ----- Call Thrive Copilot -----
  let raw = "";
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
      raw = (j?.content ?? "").toString();
    } else {
      console.error("thrive-ai-chat failed", aiResp.status, await aiResp.text());
    }
  } catch (e) {
    console.error("thrive-ai-chat call threw", e);
  }

  const { visible, actions, planCount } = extractActions(raw);
  const reply = visible || "Got it — I'll get back to you shortly.";

  // Send the conversational reply first
  await tg("sendMessage", { chat_id: chatId, text: reply }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

  // Plans aren't approvable inline yet — nudge the user to the app
  if (planCount > 0) {
    await tg("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text: `📋 I drafted a multi-step plan. Open ThriveIN to review and approve it — inline plan approval coming soon.`,
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
  }

  // For each <action> tag → propose via orchestrator → post inline keyboard
  for (const intentObj of actions) {
    try {
      const orchResp = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE}`,
          "x-internal-user-id": resolvedUserId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: intentObj.intent,
          context: { surface: intentObj.surface ?? "home", channel: "telegram" },
        }),
      });
      const run = await orchResp.json().catch(() => ({}));
      const proposed = (run?.actions ?? []).filter(
        (a: any) => a.status === "proposed",
      );
      for (const a of proposed) {
        await tg("sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: approvalCardText(a),
          reply_markup: approvalKeyboard(a.id),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      // Auto-executed actions: confirm them inline so the user knows it ran.
      const autoRan = (run?.actions ?? []).filter(
        (a: any) => a.status === "auto_executed" || a.status === "executed",
      );
      for (const a of autoRan) {
        await tg("sendMessage", {
          chat_id: chatId, parse_mode: "HTML",
          text: `✅ <b>${escapeHtml(a.preview_title ?? a.tool_name ?? "Done")}</b>`,
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
    } catch (err) {
      console.error("orchestrator propose failed", err);
      await tg("sendMessage", {
        chat_id: chatId,
        text: "⚠️ I couldn't queue that action. Try again, or open ThriveIN.",
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }
  }

  return new Response(JSON.stringify({ ok: true, actions: actions.length }));
});
