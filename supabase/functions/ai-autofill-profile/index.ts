import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlSearch(query: string, apiKey: string, limit = 5) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  return res.json();
}

async function firecrawlScrape(url: string, apiKey: string) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
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
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    const { full_name, url, current_role } = await req.json();

    if (!full_name && !url) {
      return new Response(JSON.stringify({ error: 'full_name or url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let webContext = '';

    // If a URL is provided (LinkedIn, IMDb, portfolio), scrape it
    if (url && firecrawlKey) {
      try {
        const scrapeData = await firecrawlScrape(url, firecrawlKey);
        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
        if (markdown) {
          webContext += `\n\n--- Scraped from ${url} ---\n${markdown.slice(0, 3000)}`;
        }
      } catch (e) {
        console.error('Scrape failed:', e);
      }
    }

    // Search the web for the person
    if (full_name && firecrawlKey) {
      try {
        const searchResults = await firecrawlSearch(
          `"${full_name}" ${current_role || 'creative'} profile`,
          firecrawlKey, 5
        );
        for (const result of (searchResults?.data || []).slice(0, 4)) {
          webContext += `\n\n--- ${result.url} ---\nTitle: ${result.title}\nDescription: ${result.description || ''}`;
        }
      } catch (e) {
        console.error('Search failed:', e);
      }
    }

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'AI not available' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use AI to extract structured profile data
    const extracted = await aiExtract(
      `Person: ${full_name || 'Unknown'}\nURL provided: ${url || 'None'}\nCurrent role hint: ${current_role || 'None'}\n\nWeb data:\n${webContext || 'No web data found'}`,
      `You are a profile data extractor for a creative professional platform (musicians, filmmakers, designers, content creators, etc).

From the web data, extract as much as you can about this person. Return a JSON object with these fields:
- "role": Their primary creative role (e.g. "Music Producer", "Filmmaker", "Photographer", "Content Creator"). Use a specific role, not generic.
- "bio": A concise 2-3 sentence professional bio in third person. Max 200 chars. No emojis, no buzzwords like "passionate" or "visionary".
- "location": Their city/country if detectable (e.g. "London, UK", "Los Angeles", "Trinidad & Tobago")
- "skills": Array of 5-8 professional skills relevant to their work (e.g. ["Music Production", "Songwriting", "Beat Making"])
- "job_title": Their most specific job title
- "industry": Their industry (e.g. "Music", "Film & TV", "Fashion", "Design")
- "avatar_url": URL to their profile photo if found (from LinkedIn, website, etc). null if not found.
- "website": Their personal website URL if found. null if not found.

Rules:
- Only include data you are confident about from the web results
- If uncertain about a field, set it to null
- Do NOT fabricate information
- Return raw JSON only, no markdown fences`,
      lovableKey
    );

    let profile: any = {};
    try {
      const cleaned = extracted.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      profile = JSON.parse(cleaned);
    } catch (e) {
      console.error('AI parse failed:', e, extracted);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ai-autofill] Profile extracted for ${full_name}:`, profile);

    return new Response(JSON.stringify({ success: true, profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ai-autofill] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
