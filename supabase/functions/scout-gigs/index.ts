// Smart Gig Scout — finds REAL external gigs across web, gig boards, ATS,
// LinkedIn public job pages, and Instagram casting hashtags.
// Triggered manually from /gigs ("Scan now") or via daily cron.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/search";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Profile {
  user_id: string;
  full_name: string | null;
  role: string | null;
  sub_roles: string[] | null;
  skills: string[] | null;
  location: string | null;
  bio: string | null;
}

interface ScoutPrefs {
  sources: string[];
  extra_keywords: string[] | null;
  exclude_keywords: string[] | null;
  remote_only: boolean;
  min_fit_score: number;
}

// Curated, scrapable, English-speaking creative gig sources
const WEB_SITES = [
  "mandy.com", "backstage.com", "productionhub.com", "stage32.com",
  "soundbetter.com", "workingnotworking.com", "contra.com",
  "weworkremotely.com", "mediabistro.com", "coroflot.com",
  "dribbble.com/jobs", "behance.net/joblist", "authenticjobs.com",
  "remoteok.com", "freelancer.com", "upwork.com", "peopleperhour.com",
  "twine.net", "thedots.co", "krop.com", "talenthouse.com",
  "wellfound.com", "ycombinator.com/jobs", "remote.co", "justremote.co",
  "weworkremotely.com/categories/remote-design-jobs",
  "creativepool.com", "if-you-could.co.uk", "designjobsboard.com",
  "freelancermap.com", "wellfound.com/jobs",
];

const ATS_SITES = [
  "greenhouse.io", "lever.co", "ashbyhq.com", "workable.com",
  "jobs.smartrecruiters.com", "myworkdayjobs.com", "bamboohr.com/jobs",
  "recruitee.com", "teamtailor.com", "jobvite.com",
];

const FB_QUERIES = [
  "facebook.com/groups creative gigs",
  "facebook.com/groups freelance",
];

function buildSearchQueries(p: Profile, prefs: ScoutPrefs): { source: string; query: string }[] {
  const role = p.role || "creative";
  const subs = (p.sub_roles || []).slice(0, 2);
  const skills = (p.skills || []).slice(0, 4);
  const loc = prefs.remote_only ? "remote" : (p.location || "remote");
  const extra = (prefs.extra_keywords || []).slice(0, 3).join(" ");

  const baseTerms = [role, ...subs, ...skills.slice(0, 2), extra].filter(Boolean).join(" ").trim();
  const queries: { source: string; query: string }[] = [];

  if (prefs.sources.includes("web")) {
    for (const site of WEB_SITES.slice(0, 6)) {
      queries.push({ source: "web", query: `site:${site} ${baseTerms} ${loc}` });
    }
  }
  if (prefs.sources.includes("ats")) {
    for (const site of ATS_SITES) {
      queries.push({ source: "ats", query: `site:${site} ${role} ${skills[0] || ""} ${loc}`.trim() });
    }
  }
  if (prefs.sources.includes("linkedin")) {
    // ONE LinkedIn query only — was dominating results
    queries.push({ source: "linkedin", query: `site:linkedin.com/jobs "${skills[0] || role}" ${loc}` });
  }
  if (prefs.sources.includes("instagram")) {
    // IG public hashtag pages — best for casting / open calls
    queries.push({
      source: "instagram",
      query: `site:instagram.com/explore/tags casting ${role} ${loc}`,
    });
    queries.push({
      source: "instagram",
      query: `site:instagram.com "open call" ${role} ${loc}`,
    });
    queries.push({
      source: "instagram",
      query: `site:instagram.com/explore/tags ${role}gig ${loc}`,
    });
  }
  if (prefs.sources.includes("facebook")) {
    for (const q of FB_QUERIES) {
      queries.push({ source: "web", query: `site:${q} ${role} ${loc}` });
    }
  }
  return queries;
}

async function firecrawlSearch(query: string, key: string) {
  const r = await fetch(FIRECRAWL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: 6,
      // RECENCY: only results from the past WEEK (was past month)
      tbs: "qdr:w",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!r.ok) {
    console.warn("[scout] firecrawl fail", query, r.status);
    return [];
  }
  const j = await r.json();
  const arr = Array.isArray(j.data) ? j.data
    : Array.isArray(j.data?.web) ? j.data.web
    : Array.isArray(j.web) ? j.web
    : [];
  return arr as Array<{ url: string; title?: string; markdown?: string; description?: string }>;
}

async function extractAndScore(
  raw: Array<{ url: string; title?: string; markdown?: string; description?: string; source: string }>,
  profile: Profile,
  lovableKey: string,
) {
  if (raw.length === 0) return [];
  const snippets = raw
    .slice(0, 30)
    .map((r, i) =>
      `[${i + 1}] SOURCE:${r.source}\nURL:${r.url}\nTITLE:${r.title || ""}\nCONTENT:${(r.markdown || r.description || "").slice(0, 1200)}`,
    )
    .join("\n\n---\n\n");

  const profileBlurb = `Role: ${profile.role || "creative"}
Sub-roles: ${(profile.sub_roles || []).join(", ")}
Skills: ${(profile.skills || []).join(", ")}
Location: ${profile.location || "remote"}
Bio: ${(profile.bio || "").slice(0, 300)}`;

  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You extract REAL, RECENTLY POSTED paid creative gigs from search results. STRICT RULES: (1) Skip ANY post older than 30 days — if the snippet mentions '1 year ago', '6 months ago', 'no longer accepting', 'expired', 'closed', or a date older than 30 days, REJECT IT. (2) Skip generic listing pages, articles, blog posts. (3) Only return entries that are clearly active job/casting/freelance posts. (4) Score fit 0-100 against the creator profile.",
        },
        {
          role: "user",
          content: `TODAY: ${new Date().toISOString().slice(0,10)}\n\nCREATOR PROFILE:\n${profileBlurb}\n\nSEARCH RESULTS:\n${snippets}\n\nExtract ONLY active gigs posted in the last 30 days. For each: title, company, location, remote, description (1-2 sentences), compensation, contact_email, apply_url, posted_age (e.g. "2 days ago", "3 weeks ago" — REQUIRED, infer from snippet), skills, fit_score, fit_reason, source.`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_gigs",
          description: "Save extracted real gigs",
          parameters: {
            type: "object",
            properties: {
              gigs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    remote: { type: "boolean" },
                    description: { type: "string" },
                    compensation: { type: "string" },
                    contact_email: { type: "string" },
                    apply_url: { type: "string" },
                    source_url: { type: "string" },
                    source: { type: "string", enum: ["web","linkedin","instagram","ats","gigboard"] },
                    source_name: { type: "string" },
                    skills: { type: "array", items: { type: "string" } },
                    fit_score: { type: "number" },
                    fit_reason: { type: "string" },
                    posted_age: { type: "string", description: "e.g. '2 days ago', '3 weeks ago'" },
                  },
                  required: ["title","source_url","source","fit_score","fit_reason","posted_age"],
                },
              },
            },
            required: ["gigs"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_gigs" } },
    }),
  });
  if (!r.ok) {
    console.error("[scout] AI fail", r.status, await r.text());
    return [];
  }
  const j = await r.json();
  try {
    const args = JSON.parse(j.choices[0].message.tool_calls[0].function.arguments);
    return (args.gigs || []) as any[];
  } catch (e) {
    console.error("[scout] parse fail", e);
    return [];
  }
}

function dedupeKey(g: { source_url: string; title: string }) {
  // Strip query/hash from URL + lowercase title
  const url = (g.source_url || "").split("?")[0].split("#")[0].toLowerCase();
  const title = (g.title || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  return `${url}::${title}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
  const aiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!fcKey || !aiKey) {
    return new Response(JSON.stringify({ error: "Scout not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let userId: string | null = null;
  let trigger = "manual";
  try {
    const body = await req.json().catch(() => ({}));
    trigger = body.trigger || "manual";

    // Resolve user from JWT (manual) or body (cron)
    if (body.user_id) {
      userId = body.user_id;
    } else {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: profile }, { data: prefsRow }] = await Promise.all([
      supabase.from("profiles")
        .select("user_id, full_name, role, sub_roles, professional_skills, passion_skills, location, bio")
        .eq("user_id", userId).maybeSingle(),
      supabase.from("scout_preferences").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mergedProfile: Profile = {
      user_id: (profile as any).user_id,
      full_name: (profile as any).full_name,
      role: (profile as any).role,
      sub_roles: (profile as any).sub_roles,
      skills: [
        ...((profile as any).professional_skills || []),
        ...((profile as any).passion_skills || []),
      ],
      location: (profile as any).location,
      bio: (profile as any).bio,
    };

    // Auto-create prefs if missing
    let prefs: ScoutPrefs = prefsRow ?? {
      sources: ["web", "linkedin", "instagram", "ats"],
      extra_keywords: null, exclude_keywords: null, remote_only: false, min_fit_score: 60,
    } as ScoutPrefs;
    if (!prefsRow) {
      await supabase.from("scout_preferences").insert({ user_id: userId });
    }

    const queries = buildSearchQueries(mergedProfile, prefs);
    console.log("[scout] queries", queries.length, "for", userId);

    // Run searches in parallel (cap concurrency by chunking)
    const allRaw: any[] = [];
    const CHUNK = 4;
    for (let i = 0; i < queries.length; i += CHUNK) {
      const batch = queries.slice(i, i + CHUNK);
      const results = await Promise.all(batch.map(async (q) => {
        const items = await firecrawlSearch(q.query, fcKey);
        return items.map((it) => ({ ...it, source: q.source }));
      }));
      results.flat().forEach((r) => allRaw.push(r));
    }
    console.log("[scout] raw results", allRaw.length);

    const extracted = await extractAndScore(allRaw, mergedProfile, aiKey);
    // Reject anything older than 30 days based on AI-extracted posted_age
    const isStale = (age: string) => {
      if (!age) return true;
      const a = age.toLowerCase();
      if (/year|yr/.test(a)) return true;
      if (/month/.test(a)) {
        const n = parseInt(a, 10) || 1;
        return n > 1;
      }
      if (/no longer|expired|closed|filled/.test(a)) return true;
      return false;
    };
    const filtered = extracted.filter((g: any) => {
      if (!g.title || !g.source_url) return false;
      if ((g.fit_score ?? 0) < prefs.min_fit_score) return false;
      if (isStale(g.posted_age || "")) return false;
      const blob = `${g.title} ${g.description || ""} ${g.posted_age || ""}`.toLowerCase();
      if (/no longer accepting|expired|position closed|1 year ago|2 years ago/.test(blob)) return false;
      if ((prefs.exclude_keywords || []).some((kw) => kw && blob.includes(kw.toLowerCase()))) return false;
      return true;
    });
    console.log("[scout] after recency filter", filtered.length, "of", extracted.length);

    let inserted = 0;
    for (const g of filtered) {
      const key = dedupeKey(g);
      const { error } = await supabase.from("scouted_gigs").upsert({
        target_user_id: userId,
        source: g.source,
        source_name: g.source_name || g.source,
        source_url: g.source_url,
        title: g.title.slice(0, 200),
        company: g.company || null,
        location: g.location || null,
        remote: !!g.remote,
        description: g.description || null,
        compensation: g.compensation || null,
        contact_email: g.contact_email || null,
        apply_url: g.apply_url || g.source_url,
        skills: g.skills || null,
        fit_score: Math.round(g.fit_score),
        fit_reason: g.fit_reason || null,
        dedupe_key: key,
        raw: g,
      }, { onConflict: "target_user_id,dedupe_key", ignoreDuplicates: false });
      if (!error) inserted++;
      else console.warn("[scout] upsert fail", error.message);
    }

    await supabase.from("scout_runs").insert({
      user_id: userId, trigger, sources: prefs.sources,
      found_count: extracted.length, inserted_count: inserted,
      duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString(),
    });
    await supabase.from("scout_preferences")
      .update({ last_run_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      ok: true, found: extracted.length, inserted, queries: queries.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[scout] error", e);
    if (userId) {
      await supabase.from("scout_runs").insert({
        user_id: userId, trigger, error: String(e),
        duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString(),
      }).then(() => {}, () => {});
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
