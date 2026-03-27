import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WALLET-TRANSFER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { recipientId, amount, currency = "USD", description } = await req.json();

    if (!recipientId || !amount || amount <= 0) {
      throw new Error("Missing or invalid recipient/amount");
    }

    if (recipientId === user.id) {
      throw new Error("Cannot transfer to yourself");
    }

    logStep("Transfer request", { senderId: user.id, recipientId, amount, currency });

    // Check transfer limits
    const { data: limitCheck, error: limitError } = await supabaseAdmin
      .rpc("check_transfer_limit", {
        p_user_id: user.id,
        p_amount: amount,
        p_currency: currency.toUpperCase(),
      });

    if (limitError) throw limitError;
    
    const limitResult = limitCheck as any;
    if (!limitResult?.allowed) {
      throw new Error(limitResult?.reason || "Transfer limit exceeded");
    }

    // Check sender has sufficient balance
    const { data: senderWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const senderBalance = senderWallet?.balance || 0;
    if (senderBalance < amount) {
      throw new Error(`Insufficient balance. You have $${senderBalance.toFixed(2)} available.`);
    }

    // Check recipient exists
    const { data: recipient } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", recipientId)
      .single();

    if (!recipient) throw new Error("Recipient not found");

    // Ensure recipient has a wallet
    const { data: recipientWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", recipientId)
      .maybeSingle();

    if (!recipientWallet) {
      await supabaseAdmin
        .from("wallets")
        .insert({ user_id: recipientId, balance: 0, credits: 0 });
    }

    const recipientBalance = recipientWallet?.balance || 0;

    // Deduct from sender
    await supabaseAdmin
      .from("wallets")
      .update({ balance: senderBalance - amount, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Add to recipient
    await supabaseAdmin
      .from("wallets")
      .update({ balance: recipientBalance + amount, updated_at: new Date().toISOString() })
      .eq("user_id", recipientId);

    // Record transfer
    await supabaseAdmin
      .from("wallet_transfers")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        amount,
        currency: currency.toUpperCase(),
        description: description || `Transfer to ${recipient.full_name}`,
        status: "completed",
      });

    // Get sender name for notifications
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    // Record transactions for both users
    await supabaseAdmin.from("transactions").insert([
      {
        user_id: user.id,
        type: "sent",
        amount,
        description: description || `Sent to ${recipient.full_name}`,
      },
      {
        user_id: recipientId,
        type: "received",
        amount,
        description: description || `Received from ${senderProfile?.full_name || "Someone"}`,
      },
    ]);

    // Create notification for recipient
    await supabaseAdmin.rpc("create_notification", {
      p_user_id: recipientId,
      p_title: "Money Received! 💰",
      p_message: `${senderProfile?.full_name || "Someone"} sent you $${amount.toFixed(2)} ${currency.toUpperCase()}`,
      p_type: "payment",
      p_link: "/thrivepay",
      p_action_url: "/thrivepay",
      p_action_text: "View Wallet",
      p_priority: "high",
      p_category: "payment",
    });

    logStep("Transfer completed", {
      amount,
      newSenderBalance: senderBalance - amount,
      newRecipientBalance: recipientBalance + amount,
    });

    return new Response(JSON.stringify({
      success: true,
      newBalance: senderBalance - amount,
      recipientName: recipient.full_name,
      amount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
