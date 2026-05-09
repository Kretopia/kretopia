import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  email: z.string().trim().email().max(255).transform((s) => s.toLowerCase()),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { email } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upsert wallet
    const { data: existing } = await admin
      .from("guest_wallets")
      .select("id, balance_cents, currency")
      .eq("email", email)
      .maybeSingle();

    let walletId: string;
    let balance = 0;
    let currency = "USD";

    if (existing) {
      walletId = existing.id;
      balance = existing.balance_cents;
      currency = existing.currency;
    } else {
      const { data: created, error } = await admin
        .from("guest_wallets")
        .insert({ email })
        .select("id, balance_cents, currency")
        .single();
      if (error) throw error;
      walletId = created.id;
      balance = created.balance_cents;
      currency = created.currency;
    }

    // Mint session token
    const { data: session, error: sessionError } = await admin
      .from("guest_wallet_sessions")
      .insert({ wallet_id: walletId })
      .select("token, expires_at")
      .single();
    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({
        token: session.token,
        expiresAt: session.expires_at,
        walletId,
        balanceCents: balance,
        currency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[guest-wallet-session] error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
