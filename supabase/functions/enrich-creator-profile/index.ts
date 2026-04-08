import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function firecrawlScrape(url: string, apiKey: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  return res.json();
}

async function firecrawlSearch(query: string, apiKey: string, limit = 8) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  return res.json();
}

async function aiExtract(prompt: string, systemPrompt: string, lovableKey: string) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, scrape_website } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: Record<string, number> = {
      enriched_press: 0, new_press: 0, new_awards: 0, skills_added: 0, bio_generated: 0
    };

    // Load profile + existing data
    const [profileRes, pressRes, awardsRes, creditsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, website, linkedin_url, imdb_url, bio, professional_skills, passion_skills, job_title, industry, role').eq('user_id', user_id).maybeSingle(),
      supabase.from('press_links').select('id, url, title, publication, image_url, excerpt, og_data').eq('user_id', user_id),
      supabase.from('awards').select('id, title').eq('user_id', user_id),
      supabase.from('credits').select('project_name, role, year, credit_category, platform').eq('user_id', user_id).order('year', { ascending: false }).limit(50),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const existingPressUrls = new Set((pressRes.data || []).map((l: any) => l.url));
    const existingAwardTitles = new Set((awardsRes.data || []).map((a: any) => a.title?.toLowerCase()));
    const credits = creditsRes.data || [];

    // ═══════════════════════════════════════════════════
    // 1. ENRICH EXISTING PRESS LINKS (missing metadata)
    // ═══════════════════════════════════════════════════
    if (firecrawlKey) {
      const incompletePressLinks = (pressRes.data || []).filter(
        (l: any) => l.url && (!l.publication || !l.image_url || !l.excerpt || (l.title && (l.title.includes('&#') || l.title.includes('&amp;'))))
      );

      for (const link of incompletePressLinks.slice(0, 5)) {
        try {
          const scrapeData = await firecrawlScrape(link.url, firecrawlKey);
          const metadata = scrapeData?.data?.metadata || scrapeData?.metadata;
          if (!metadata) continue;

          const updates: Record<string, any> = {};
          if (!link.publication && metadata.ogSiteName) updates.publication = metadata.ogSiteName;
          if (!link.image_url && (metadata.ogImage || metadata.image)) updates.image_url = metadata.ogImage || metadata.image;
          if (!link.excerpt && metadata.description) updates.excerpt = metadata.description;
          if (link.title && (link.title.includes('&#') || link.title.includes('&amp;'))) {
            updates.title = decodeHtml(link.title);
          }
          if (!link.og_data) {
            updates.og_data = { title: metadata.title, description: metadata.description, image: metadata.ogImage, site_name: metadata.ogSiteName };
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from('press_links').update(updates).eq('id', link.id);
            results.enriched_press++;
          }
        } catch (e) {
          console.error(`Press enrich failed for ${link.id}:`, e);
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. DISCOVER PRESS & AWARDS FROM WEB SEARCH
    // ═══════════════════════════════════════════════════
    if (scrape_website && firecrawlKey && profile.full_name) {
      const socialFilter = /facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|tiktok\.com|spotify\.com/i;

      // Search for press mentions
      try {
        const pressSearch = await firecrawlSearch(
          `"${profile.full_name}" interview OR feature OR profile OR press OR article`,
          firecrawlKey, 8
        );
        for (const result of (pressSearch?.data || [])) {
          if (!result.url || existingPressUrls.has(result.url) || socialFilter.test(result.url)) continue;
          let hostname = '';
          try { hostname = new URL(result.url).hostname.replace('www.', ''); } catch { continue; }

          await supabase.from('press_links').insert({
            user_id,
            title: decodeHtml(result.title || 'Press Mention'),
            url: result.url,
            publication: result.metadata?.ogSiteName || hostname,
            image_url: result.metadata?.ogImage || null,
            excerpt: result.description || null,
            verification_status: 'auto_discovered',
          });
          results.new_press++;
          existingPressUrls.add(result.url);
        }
      } catch (e) {
        console.error('Press search failed:', e);
      }

      // Search for awards
      try {
        const awardsSearch = await firecrawlSearch(
          `"${profile.full_name}" award OR winner OR nominated OR nomination OR recognition OR honor`,
          firecrawlKey, 6
        );

        if (lovableKey && (awardsSearch?.data || []).length > 0) {
          const snippets = (awardsSearch.data || [])
            .slice(0, 5)
            .map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\nDescription: ${r.description || ''}`)
            .join('\n---\n');

          const extracted = await aiExtract(
            `Creator name: ${profile.full_name}\nRole: ${profile.role || profile.job_title || 'Creative'}\n\nWeb results:\n${snippets}`,
            `You extract award/recognition information from web search results for a specific creator.
Return ONLY a JSON array of awards. Each award must have: "title" (award name), "organization" (granting body), "year" (number or null), "category" (e.g., "Film", "Music", "Design", null).
Rules:
- Only include awards specifically given TO this person (not just mentioned alongside them)
- Do NOT fabricate awards. If uncertain, skip.
- Return [] if no real awards found.
- Return raw JSON array only, no markdown.`,
            lovableKey
          );

          try {
            const cleanJson = extracted.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const awards: any[] = JSON.parse(cleanJson);
            for (const award of awards) {
              if (!award.title || existingAwardTitles.has(award.title.toLowerCase())) continue;
              await supabase.from('awards').insert({
                user_id,
                title: award.title,
                organization: award.organization || 'Unknown',
                year: award.year || null,
                category: award.category || null,
                verification_status: 'auto_discovered',
              });
              results.new_awards++;
              existingAwardTitles.add(award.title.toLowerCase());
            }
          } catch (e) {
            console.error('Award parse failed:', e);
          }
        }
      } catch (e) {
        console.error('Awards search failed:', e);
      }
    }

    // ═══════════════════════════════════════════════════
    // 3. AUTO-INFER SKILLS FROM CREDITS
    // ═══════════════════════════════════════════════════
    const currentSkills = Array.isArray(profile.professional_skills) ? profile.professional_skills : [];
    if (lovableKey && credits.length >= 3 && currentSkills.length < 3) {
      try {
        const creditSummary = credits.slice(0, 30).map((c: any) =>
          `${c.project_name} - ${c.role} (${c.credit_category || 'unknown'}, ${c.year || 'unknown'})`
        ).join('\n');

        const skillsRaw = await aiExtract(
          `Creator: ${profile.full_name}\nCurrent role: ${profile.role || profile.job_title || 'Creative'}\nIndustry: ${profile.industry || 'Creative'}\n\nWork history:\n${creditSummary}`,
          `Based on this creator's work history, infer their top professional skills.
Return a JSON array of skill strings (5-8 skills max).
Skills should be industry-specific and professional (e.g., "Cinematography", "Music Production", "Brand Strategy", "Event Curation").
Do NOT include generic skills like "Communication" or "Teamwork".
Return raw JSON array only, no markdown.`,
          lovableKey
        );

        const cleanJson = skillsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const inferredSkills: string[] = JSON.parse(cleanJson);
        if (inferredSkills.length > 0) {
          const existingSet = new Set(currentSkills.map((s: any) => (typeof s === 'string' ? s : s?.skill || s?.name || '').toLowerCase()));
          const newSkills = inferredSkills.filter(s => !existingSet.has(s.toLowerCase()));
          if (newSkills.length > 0) {
            const merged = [...currentSkills, ...newSkills.slice(0, 8 - currentSkills.length)];
            await supabase.from('profiles').update({ professional_skills: merged }).eq('user_id', user_id);
            results.skills_added = newSkills.length;
          }
        }
      } catch (e) {
        console.error('Skills inference failed:', e);
      }
    }

    // ═══════════════════════════════════════════════════
    // 4. AUTO-GENERATE BIO IF MISSING
    // ═══════════════════════════════════════════════════
    if (lovableKey && (!profile.bio || profile.bio.length < 20) && credits.length >= 2) {
      try {
        const topCredits = credits.slice(0, 10).map((c: any) =>
          `${c.project_name} (${c.role}, ${c.year || 'N/A'})`
        ).join(', ');

        const bio = await aiExtract(
          `Name: ${profile.full_name}\nRole: ${profile.role || profile.job_title || 'Creative Professional'}\nIndustry: ${profile.industry || ''}\nLocation: ${profile.bio ? '' : 'unknown'}\nNotable work: ${topCredits}`,
          `Write a concise, professional bio (2-3 sentences, max 200 chars) for this creative professional.
Tone: Confident, third-person. Focus on their expertise and notable work.
Do NOT use emojis. Do NOT use buzzwords like "passionate" or "visionary".
Return ONLY the bio text, no quotes or labels.`,
          lovableKey
        );

        if (bio && bio.length > 20 && bio.length < 500) {
          await supabase.from('profiles').update({ bio: bio.trim() }).eq('user_id', user_id);
          results.bio_generated = 1;
        }
      } catch (e) {
        console.error('Bio generation failed:', e);
      }
    }

    // ═══════════════════════════════════════════════════
    // 5. DISCOVER CREDITS FROM WEB (IMDb, Spotify, etc.)
    // ═══════════════════════════════════════════════════
    const existingCredits = new Set(credits.map((c: any) => `${c.project_name?.toLowerCase()}|${c.role?.toLowerCase()}`));

    // Load deleted credits so we never re-add them
    const { data: deletedCredits } = await supabase
      .from('deleted_credits')
      .select('project_name_lower, role_lower')
      .eq('user_id', user_id);
    const deletedSet = new Set((deletedCredits || []).map((d: any) => `${d.project_name_lower}|${d.role_lower}`));

    if (scrape_website && firecrawlKey && lovableKey && profile.full_name) {
      // Search for credits on professional platforms
      const creditSearchQueries = [
        `"${profile.full_name}" site:imdb.com`,
        `"${profile.full_name}" site:spotify.com OR site:music.apple.com OR site:soundcloud.com`,
        `"${profile.full_name}" credits OR filmography OR discography OR portfolio`,
      ];

      let allCreditSnippets = '';
      for (const q of creditSearchQueries) {
        try {
          const res = await firecrawlSearch(q, firecrawlKey, 5);
          for (const r of (res?.data || []).slice(0, 3)) {
            allCreditSnippets += `\nSource: ${r.url}\nTitle: ${r.title}\nDescription: ${r.description || ''}\n---`;
          }
        } catch (e) {
          console.error('Credit search failed:', e);
        }
      }

      // Also scrape their IMDb/LinkedIn/website if available
      const urlsToScrape = [profile.imdb_url, profile.linkedin_url, profile.website].filter(Boolean);
      for (const url of urlsToScrape.slice(0, 2)) {
        try {
          const scrapeData = await firecrawlScrape(url!, firecrawlKey);
          const md = scrapeData?.data?.markdown || '';
          if (md) allCreditSnippets += `\n\n--- Scraped: ${url} ---\n${md.slice(0, 4000)}`;
        } catch (e) {
          console.error(`Scrape failed for ${url}:`, e);
        }
      }

      if (allCreditSnippets.length > 50) {
        try {
          const creditsRaw = await aiExtract(
            `Creator: ${profile.full_name}\nRole: ${profile.role || profile.job_title || 'Creative'}\n\nWeb data:\n${allCreditSnippets.slice(0, 8000)}`,
            `You extract professional credits/work history from web data for a creative professional.
Return a JSON array of credits. Each credit:
- "project_name": Name of the project/film/song/album/show/campaign (string, required)
- "role": Their specific role (e.g. "Director", "Producer", "Songwriter", "Cinematographer") (string, required)
- "year": Year (number or null)
- "credit_category": One of: "film", "tv", "music", "music_video", "commercial", "fashion", "events", "theatre", "podcast", "photography", "design", "gaming", "other"
- "platform": Source platform if known (e.g. "IMDb", "Spotify", "LinkedIn") or null
- "url": URL to the specific work if available, or null

Rules:
- Only include credits specifically FOR this person
- Do NOT fabricate credits. Only use verifiable data from the web results.
- Deduplicate: if same project+role appears multiple times, include only once
- Max 20 credits
- Return raw JSON array, no markdown`,
            lovableKey
          );

          const cleanJson = creditsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const discoveredCredits: any[] = JSON.parse(cleanJson);
          let newCreditsCount = 0;

          for (const c of discoveredCredits) {
            if (!c.project_name || !c.role) continue;
            const key = `${c.project_name.toLowerCase()}|${c.role.toLowerCase()}`;
            if (existingCredits.has(key)) continue;
            // Skip credits the user previously deleted
            if (deletedSet.has(key)) {
              console.log(`[enrich] Skipping deleted credit: ${c.project_name}`);
              continue;
            }

            // Use plain insert instead of broken upsert with functional onConflict
            // Check for existing credit first
            const { data: existing } = await supabase.from('credits')
              .select('id')
              .eq('user_id', user_id)
              .ilike('project_name', c.project_name)
              .ilike('role', c.role)
              .limit(1);
            if (existing && existing.length > 0) {
              existingCredits.add(key);
              continue;
            }

            const { error: insertErr } = await supabase.from('credits').insert({
              user_id,
              project_name: c.project_name,
              role: c.role,
              year: c.year || null,
              credit_category: c.credit_category || null,
              platform: c.platform || null,
              url: c.url || null,
              source: 'ai_discovered',
              verification_status: 'unverified',
            });
            if (insertErr) console.log(`Credit insert skipped: ${c.project_name} - ${insertErr.message}`);
            existingCredits.add(key);
            newCreditsCount++;
          }
          (results as any).new_credits = newCreditsCount;
          console.log(`[enrich] Discovered ${newCreditsCount} new credits for ${profile.full_name}`);
        } catch (e) {
          console.error('Credit extraction failed:', e);
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // 6. AUTO-INFER JOB TITLE IF MISSING
    // ═══════════════════════════════════════════════════
    if (lovableKey && !profile.job_title && credits.length >= 2) {
      try {
        const roles = credits.slice(0, 20).map((c: any) => c.role).filter(Boolean);
        const roleCounts: Record<string, number> = {};
        roles.forEach((r: string) => { roleCounts[r] = (roleCounts[r] || 0) + 1; });
        const sorted = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          // Use most frequent role as job title
          const topRole = sorted[0][0];
          await supabase.from('profiles').update({ job_title: topRole }).eq('user_id', user_id);
        }
      } catch (e) {
        console.error('Job title inference failed:', e);
      }
    }

    // ═══════════════════════════════════════════════════
    // 7. AUTO-INFER INDUSTRY IF MISSING
    // ═══════════════════════════════════════════════════
    if (!profile.industry && credits.length >= 2) {
      const categories = credits.map((c: any) => c.credit_category).filter(Boolean);
      const catCounts: Record<string, number> = {};
      categories.forEach((c: string) => { catCounts[c] = (catCounts[c] || 0) + 1; });
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        const industryMap: Record<string, string> = {
          'film': 'Film & TV', 'tv': 'Film & TV', 'music_video': 'Film & TV',
          'music': 'Music', 'podcast': 'Media & Content', 'commercial': 'Advertising',
          'fashion': 'Fashion', 'events': 'Events & Entertainment', 'theatre': 'Performing Arts',
          'photography': 'Photography', 'design': 'Design', 'gaming': 'Gaming',
        };
        const industry = industryMap[topCat[0]] || 'Creative Industries';
        await supabase.from('profiles').update({ industry }).eq('user_id', user_id);
      }
    }

    console.log(`Enrichment complete for ${user_id}:`, results);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in enrich-creator-profile:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
