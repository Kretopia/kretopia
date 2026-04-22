import { supabase } from "@/integrations/supabase/client";

/**
 * After-Claim Engagement Loop — Day 0 in-app nudges.
 * Fires immediately after onboarding completes. Inserts up to 3 personalized
 * notifications so the user opens the app to actual signal, not silence.
 *
 * Idempotent: skips if user already has any of these category notifications.
 */
export async function seedAfterClaimNudges(userId: string, opts: {
  role?: string | null;
  location?: string | null;
  intent?: "collaborate" | "gigs" | "fund" | "manage" | null;
}): Promise<void> {
  try {
    // Idempotency — skip if we've already seeded
    const { count: existing } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", "after_claim");

    if ((existing ?? 0) > 0) {
      return;
    }

    const role = (opts.role || "").trim();
    const location = (opts.location || "").trim();
    const notifications: any[] = [];

    // 1. Matching gigs (by role keyword)
    if (role) {
      const { data: gigs } = await supabase
        .from("opportunities")
        .select("id, title")
        .eq("status", "active")
        .or(`title.ilike.%${role}%,description.ilike.%${role}%`)
        .limit(3);

      if (gigs && gigs.length > 0) {
        notifications.push({
          user_id: userId,
          type: "gig_match",
          category: "after_claim",
          priority: "high",
          title: `${gigs.length} gig${gigs.length > 1 ? "s" : ""} match your role`,
          message: `Active opportunities matching "${role}". Apply with one tap using your verified profile.`,
          action_text: "Browse matching gigs",
          action_url: "/opportunities",
          read: false,
        });
      }
    }

    // 2. Creators near you / in your role
    let nearbyQuery = supabase
      .from("profiles")
      .select("user_id, full_name", { count: "exact" })
      .eq("onboarding_completed", true)
      .neq("user_id", userId)
      .not("avatar_url", "is", null);

    if (location) nearbyQuery = nearbyQuery.ilike("location", `%${location}%`);
    else if (role) nearbyQuery = nearbyQuery.ilike("role", `%${role}%`);

    const { data: nearby, count: nearbyCount } = await nearbyQuery.limit(1);

    if ((nearbyCount ?? 0) > 0) {
      notifications.push({
        user_id: userId,
        type: "creator_match",
        category: "after_claim",
        priority: "normal",
        title: location
          ? `${nearbyCount} creator${nearbyCount === 1 ? "" : "s"} in ${location}`
          : `${nearbyCount} creator${nearbyCount === 1 ? "" : "s"} like you`,
        message: nearby?.[0]?.full_name
          ? `Including ${nearby[0].full_name}. Tap to introduce yourself.`
          : "Connect, message, and start collaborating today.",
        action_text: "Discover creators",
        action_url: "/circle",
        read: false,
      });
    }

    // 3. EPK / share nudge — universal
    notifications.push({
      user_id: userId,
      type: "share_profile",
      category: "after_claim",
      priority: "normal",
      title: "Your verified profile is live",
      message: "Share your one-link EPK so collaborators and clients can find you.",
      action_text: "View my profile",
      action_url: "/profile",
      read: false,
    });

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  } catch (err) {
    // Non-blocking — never break onboarding flow
    console.error("[afterClaimNudges] seed failed:", err);
  }
}
