import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";

interface ProfileSharePagesPluginOptions {
  projectUrl: string;
  publishableKey: string;
  siteUrl: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  is_claimed: boolean | null;
}

const FALLBACK_OG_IMAGE = "https://www.thrivein.io/og-image.png";

export function profileSharePagesPlugin(options: ProfileSharePagesPluginOptions): Plugin {
  return {
    name: "profile-share-pages",
    apply: "build",
    async closeBundle() {
      if (!options.projectUrl || !options.publishableKey || !options.siteUrl) {
        console.warn("[profile-share-pages] Missing configuration; skipping.");
        return;
      }

      const siteUrl = options.siteUrl.replace(/\/$/, "");
      const projectUrl = options.projectUrl.replace(/\/$/, "");
      const outDir = resolve(process.cwd(), "dist");

      const response = await fetch(
        `${projectUrl}/rest/v1/profiles?select=user_id,full_name,role,bio,avatar_url,location,is_claimed&order=created_at.desc&limit=500`,
        {
          headers: {
            apikey: options.publishableKey,
            Authorization: `Bearer ${options.publishableKey}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`[profile-share-pages] Failed to fetch profiles: ${response.status}`);
        return;
      }

      const profiles = (await response.json()) as ProfileRow[];
      let count = 0;

      for (const profile of profiles) {
        if (!profile.full_name) continue;

        const shareDir = resolve(outDir, "share", "profile", profile.user_id);
        mkdirSync(shareDir, { recursive: true });
        writeFileSync(resolve(shareDir, "index.html"), buildProfileShareHtml(profile, siteUrl));
        count++;
      }

      console.log(`[profile-share-pages] Generated ${count} profile share page(s).`);
    },
  };
}

function buildProfileShareHtml(profile: ProfileRow, siteUrl: string) {
  const profileUrl = `${siteUrl}/profile/${profile.user_id}`;
  const shareUrl = `${siteUrl}/share/profile/${profile.user_id}/`;
  const name = profile.full_name || "Creative Professional";
  const role = profile.role || "Creative";
  const title = `${name} — ${role} | ThriveIN`;
  const description = profile.bio
    ? truncate(profile.bio, 155)
    : `${name} is a ${role} on ThriveIN — The Creative OS. View verified credits, portfolio & connect.`;
  const image = profile.avatar_url || FALLBACK_OG_IMAGE;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="noindex,follow" />
    <link rel="canonical" href="${profileUrl}" />

    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:site_name" content="ThriveIN" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(name)}" />
    <meta property="profile:first_name" content="${escapeHtml(name.split(' ')[0])}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <meta http-equiv="refresh" content="0;url=${profileUrl}" />
    <script>window.location.replace(${JSON.stringify(profileUrl)});</script>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(role)}</p>
      <p>${escapeHtml(description)}</p>
      <p><a href="${profileUrl}">View profile on ThriveIN</a></p>
    </main>
  </body>
</html>`;
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trim() + "…";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
