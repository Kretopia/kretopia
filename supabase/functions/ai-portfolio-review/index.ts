import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, mediaType, mediaUrl, category, tags, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a portfolio coach for creative professionals. Review this portfolio piece and provide actionable, encouraging feedback.

PORTFOLIO ITEM:
- Title: ${title}
- Description: ${description || 'None provided'}
- Type: ${mediaType}
- Category: ${category || 'General'}
- Tags: ${(tags || []).join(', ') || 'None'}
- Creator's role: ${role || 'Creator'}
${mediaUrl ? `- URL: ${mediaUrl}` : ''}

Provide a review covering:
1. **Strengths** - What's compelling about this work
2. **Market Position** - How this type of work is valued in the industry
3. **Optimization Tips** - How to present it better (title, description, tags)
4. **Collaboration Potential** - What type of creators would complement this
5. **Quick Win** - One specific thing to do right now to boost visibility

Be encouraging but specific. Use data-driven insights where possible.
Keep it concise (max 200 words total).

Return ONLY valid JSON:
{
  "strengths": "...",
  "marketPosition": "...",
  "optimizationTips": "...",
  "collaborationPotential": "...",
  "quickWin": "...",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "overallScore": 85
}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI review failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI review');
    
    const review = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ review }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI portfolio review:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
