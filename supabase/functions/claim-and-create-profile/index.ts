import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DraftProfile {
  full_name?: string;
  role?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  avatar_url?: string;
  website?: string;
}

interface ClaimedCredit {
  title: string;
  url?: string;
  type?: string;
  year?: number;
  role_suggestion?: string;
  description?: string;
  thumbnail?: string;
  platform?: string;
  client_brand?: string;
  location?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email: rawEmail, profile, credits, redirect_to } = (await req.json()) as {
      email: string;
      profile: DraftProfile;
      credits: ClaimedCredit[];
      redirect_to: string;
    };

    const email = (rawEmail || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Valid email required" }, 400);
    }
    if (!profile?.full_name?.trim()) {
      return json({ error: "Profile name required" }, 400);
    }

    const cleanRedirect = redirect_to || `${SUPABASE_URL}/profile?claimed=true`;
    const result = await checkAndProvisionUser(admin, email, profile, credits, cleanRedirect);

    return json({ success: true, ...result });
  } catch (err) {
    console.error("[claim-and-create-profile] error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

async function checkAndProvisionUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  profile: DraftProfile,
  credits: ClaimedCredit[],
  redirectTo: string,
): Promise<{ is_new_user: boolean; conflicts?: Array<{ url: string; role: string; title: string; existing_owner_id?: string }> }> {
  // 1. Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;
  let isNewUser = false;
  const conflicts: Array<{ url: string; role: string; title: string; existing_owner_id?: string }> = [];

  if (found) {
    // Existing user — DO NOT overwrite their profile. Just send magic link to sign in.
    userId = found.id;
    console.log(`[claim] existing user ${userId}, sending magic link only`);
  } else {
    // 2. Create new auth user (unconfirmed, magic link will confirm)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: profile.full_name, claimed_via: "universal_flow" },
    });
    if (createErr || !created.user) throw new Error(createErr?.message || "Failed to create user");
    userId = created.user.id;
    isNewUser = true;
    console.log(`[claim] created new user ${userId}`);

    // 3. Upsert profile
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        full_name: profile.full_name,
        role: profile.role || null,
        bio: profile.bio?.slice(0, 500) || null,
        location: profile.location || null,
        professional_skills: profile.skills?.slice(0, 12) || [],
        avatar_url: profile.avatar_url || null,
        website: profile.website || null,
        onboarding_completed: false,
      },
      { onConflict: "user_id" },
    );
    if (profileErr) console.error("[claim] profile upsert error:", profileErr);

    // 4. Insert credits (verified via web) — one-by-one so we can detect dup conflicts
    if (credits?.length) {
      for (const c of credits.slice(0, 50)) {
        const role = c.role_suggestion?.slice(0, 100) || profile.role || "Creator";
        const row = {
          user_id: userId,
          project_name: c.title.slice(0, 200),
          role,
          project_type: c.type || null,
          year: c.year || null,
          url: c.url || null,
          thumbnail_url: c.thumbnail || null,
          primary_media_url: c.thumbnail || null,
          description: c.description?.slice(0, 500) || null,
          location: c.location || null,
          platform: c.platform || null,
          client_brand: c.client_brand || null,
          source: "web_verified",
          verification_status: "verified",
        };
        const { error: insErr } = await admin.from("credits").insert(row);
        if (insErr) {
          // 23505 = unique_violation → already claimed by someone else
          if ((insErr as { code?: string }).code === "23505" && c.url) {
            const { data: existing } = await admin
              .from("credits")
              .select("user_id")
              .ilike("url", c.url)
              .ilike("role", role)
              .maybeSingle();
            conflicts.push({
              url: c.url,
              role,
              title: c.title,
              existing_owner_id: existing?.user_id as string | undefined,
            });
            console.warn(`[claim] duplicate claim blocked for ${c.url} (${role})`);
          } else {
            console.error("[claim] credit insert error:", insErr);
          }
        }
      }
    }
  }

  // 5. Send magic link (works for both new + existing users)
  const { error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (linkErr) {
    console.error("[claim] magic link error:", linkErr);
    throw new Error("Couldn't send magic link");
  }

  return { is_new_user: isNewUser, conflicts: conflicts.length ? conflicts : undefined };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
