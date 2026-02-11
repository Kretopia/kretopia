import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if we already have prompts for today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('spark_prompts')
      .select('id')
      .eq('active_date', today)
      .eq('prompt_type', 'daily');

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Daily prompt already exists', prompts: existing }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate daily prompt using AI
    const categories = ['visual', 'music', 'writing', 'design', 'photography', 'film', 'general'];
    const dayOfWeek = new Date().getDay();
    const isWeeklyChallenge = dayOfWeek === 1; // Monday = weekly challenge

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: 'user',
            content: `Generate ${isWeeklyChallenge ? '1 weekly creative challenge and 1 daily prompt' : '1 daily creative prompt'} for a platform of diverse creators (musicians, designers, filmmakers, photographers, writers, etc).

Today's date: ${today}
Category focus: ${categories[dayOfWeek % categories.length]}

Requirements:
- Prompts should be inspiring, fun, and achievable in under 60 seconds
- They should encourage sharing photos, text thoughts, or links to work
- ${isWeeklyChallenge ? 'The weekly challenge should be deeper, taking a few days, with voting' : ''}
- Make it relevant to current creative trends
- Be specific enough to spark action, open enough for any creative type

Return ONLY valid JSON array:
[{
  "title": "Short catchy title (max 60 chars)",
  "description": "1-2 sentence description of what to share",
  "prompt_type": "${isWeeklyChallenge ? 'weekly_challenge' : 'daily'}",
  "category": "${categories[dayOfWeek % categories.length]}",
  "tags": ["tag1", "tag2", "tag3"]
}${isWeeklyChallenge ? ',{"title":"...","description":"...","prompt_type":"daily","category":"...","tags":["..."]}' : ''}]`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    // Parse and clean the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    
    const prompts = JSON.parse(jsonMatch[0]);

    // Insert prompts
    const promptsToInsert = prompts.map((p: any) => ({
      title: p.title,
      description: p.description,
      prompt_type: p.prompt_type || 'daily',
      category: p.category || 'general',
      tags: p.tags || [],
      active_date: today,
      is_active: true,
      expires_at: p.prompt_type === 'weekly_challenge' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { data: inserted, error } = await supabase
      .from('spark_prompts')
      .insert(promptsToInsert)
      .select();

    if (error) throw error;

    console.log(`Generated ${inserted?.length} spark prompts for ${today}`);

    return new Response(
      JSON.stringify({ success: true, prompts: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating spark prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
