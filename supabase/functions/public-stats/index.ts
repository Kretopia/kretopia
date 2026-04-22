import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

// Internal accounts to exclude from public stats
const EXCLUDED_EMAILS = [
  "ethanauguste@hotmail.com",
  "ethan@thrivein.io",
  "test@thrivein.io",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Run all reads in parallel
    const [
      profilesCount,
      connectionsCount,
      creditsCount,
      gigsCount,
      eventsCount,
      circlesCount,
      projectsCount,
      locationsRes,
      rolesRes,
    ] = await Promise.all([
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("onboarding_completed", true),
      supabase.from("connections").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      supabase.from("credits").select("id", { count: "exact", head: true }),
      supabase.from("opportunities").select("id", { count: "exact", head: true }),
      supabase.from("creative_jams").select("id", { count: "exact", head: true }),
      supabase.from("spark_rooms").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("location").not("location", "is", null).neq("location", ""),
      supabase.from("profiles").select("role").not("role", "is", null).neq("role", ""),
    ]);

    // Aggregate locations (top 6)
    const locCounts = new Map<string, number>();
    (locationsRes.data || []).forEach((row: any) => {
      const loc = String(row.location).trim();
      if (loc) locCounts.set(loc, (locCounts.get(loc) || 0) + 1);
    });
    const topLocations = Array.from(locCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([location, count]) => ({ location, count }));

    // Aggregate roles (top 8)
    const roleCounts = new Map<string, number>();
    (rolesRes.data || []).forEach((row: any) => {
      const r = String(row.role).trim();
      if (r) roleCounts.set(r, (roleCounts.get(r) || 0) + 1);
    });
    const topRoles = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, count]) => ({ role, count }));

    // Country derivation from location strings
    const countrySet = new Set<string>();
    locCounts.forEach((_, loc) => {
      const parts = loc.split(",").map((s) => s.trim());
      const country = parts[parts.length - 1];
      if (country && country.length >= 2) countrySet.add(country);
    });

    const payload = {
      stats: {
        creators: profilesCount.count || 0,
        connections: connectionsCount.count || 0,
        credits: creditsCount.count || 0,
        gigs: gigsCount.count || 0,
        events: eventsCount.count || 0,
        circles: circlesCount.count || 0,
        projects: projectsCount.count || 0,
        countries: countrySet.size,
      },
      topLocations,
      topRoles,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
