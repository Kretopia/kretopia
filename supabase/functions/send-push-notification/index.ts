import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

// VAPID helper functions
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  
  // Create JWT header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };
  
  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };

  // Encode header and payload
  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  
  // Create JWK for private key
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: vapidPublicKey.slice(0, 43), // First 32 bytes of public key after 0x04
    y: vapidPublicKey.slice(43), // Last 32 bytes
    d: vapidPrivateKey
  };

  // For proper VAPID, we need to extract x and y from the full public key
  const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);
  if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
    privateKeyJwk.x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33));
    privateKeyJwk.y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65));
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format if needed
  const signatureBytes = new Uint8Array(signature);
  const encodedSignature = uint8ArrayToBase64Url(signatureBytes);
  
  const jwt = `${unsignedToken}.${encodedSignature}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@thrivein.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[PUSH] VAPID keys not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "VAPID keys not configured. Please run generate-vapid-keys and add the keys to secrets." 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PushNotificationPayload = await req.json();
    console.log("[PUSH] Sending push notification to user:", payload.userId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.userId);

    if (subError) {
      console.error("[PUSH] Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[PUSH] No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PUSH] Found ${subscriptions.length} subscription(s)`);

    // Send to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || "/favicon.png",
            badge: payload.badge || "/favicon.png",
            data: payload.data || {},
            tag: payload.tag,
          });

          // Create VAPID authorization header
          const vapidHeaders = await createVapidAuthHeader(
            sub.endpoint,
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          );

          console.log(`[PUSH] Sending to endpoint: ${sub.endpoint.substring(0, 50)}...`);

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "TTL": "86400",
              "Authorization": vapidHeaders.authorization,
              "Crypto-Key": `p256ecdsa=${vapidHeaders.cryptoKey}`,
            },
            body: pushPayload,
          });

          console.log(`[PUSH] Response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PUSH] Failed to send: ${response.status} - ${errorText}`);
            
            // If subscription is invalid (410 Gone), remove it
            if (response.status === 410 || response.status === 404) {
              console.log("[PUSH] Removing invalid subscription");
              await supabaseClient
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
            return { success: false, endpoint: sub.endpoint, status: response.status };
          }

          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error("[PUSH] Error sending push:", error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    console.log(`[PUSH] Successfully sent: ${successCount}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PUSH] Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
