// Maps profile roles/professions to recommended workspace types.
// Used by the CreateProjectWizard to surface "Recommended for you" picks.

import type { WorkspaceType } from "./workspaceConfigs";

/**
 * Given a user's profile role string (free-form, e.g. "Photographer", "Music Producer"),
 * return an ordered list of recommended workspace types.
 * Falls back to an empty list when no signal is found.
 */
export function recommendWorkspaces(roleString: string | null | undefined): WorkspaceType[] {
  if (!roleString) return [];
  const r = roleString.toLowerCase();

  const recs: WorkspaceType[] = [];
  const push = (w: WorkspaceType) => { if (!recs.includes(w)) recs.push(w); };

  // Photo
  if (/photograph|photo|retouch|lookbook|editorial/.test(r)) {
    push("photo_shoot"); push("brand_collab"); push("edit_job");
  }
  // Video / Film
  if (/video|filmmak|director|cinemato|dop|gaffer|editor|colorist|vfx|motion/.test(r)) {
    push("video_shoot"); push("edit_job"); push("content_series");
  }
  // Music
  if (/music|producer|engineer|mix|master|songwriter|artist|rapper|singer|vocal|composer|beatmaker/.test(r)) {
    push("music_project"); push("dj_live_gig"); push("brand_collab");
  }
  // DJ
  if (/\bdj\b|turntab|selector/.test(r)) {
    push("dj_live_gig"); push("event_production"); push("music_project");
  }
  // Fashion
  if (/fashion|stylist|designer|model|runway|wardrobe|tailor/.test(r)) {
    push("fashion_show"); push("photo_shoot"); push("brand_collab");
  }
  // Event
  if (/event|producer|promoter|coordinator|planner|festival|concert/.test(r)) {
    push("event_production"); push("brand_collab"); push("dj_live_gig");
  }
  // Art
  if (/illustrator|artist|painter|sculpt|3d|graphic|tattoo/.test(r)) {
    push("commissioned_art"); push("brand_collab"); push("content_series");
  }
  // Content / influencer
  if (/influenc|creator|content|youtuber|podcast|streamer|tiktok/.test(r)) {
    push("content_series"); push("brand_collab"); push("video_shoot");
  }
  // Brand / agency
  if (/brand|agency|marketing|manager|talent/.test(r)) {
    push("brand_collab"); push("event_production"); push("content_series");
  }
  // Writer
  if (/writer|copywrit|journalist|author/.test(r)) {
    push("content_series"); push("brand_collab"); push("commissioned_art");
  }

  return recs.slice(0, 3);
}
