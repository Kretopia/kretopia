import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { text, image_base64, source_platform } = body;

    if (!text && !image_base64) {
      return new Response(JSON.stringify({ error: "Provide text or image" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Extract structured data
    const systemPrompt = `You are a casting/gig data extractor AND copywriter. Extract structured gig details from the provided text or image. 

IMPORTANT: For the "description" field, don't just copy the raw text — rewrite it as a polished, professional gig listing. Make it compelling, well-structured, and clear. Include key details like what the role involves, who they're looking for, and what makes this opportunity exciting. Use proper formatting with line breaks.

Return ONLY valid JSON with these fields:
- title: string (clean, professional title — capitalize properly)
- type: string (one of: "job", "barter", "collab", "gig", "internship")
- description: string (POLISHED, professional description — rewritten from the raw post)
- compensation: string or null (pay info if mentioned)
- location: string or null
- requirements: string or null (formatted clearly)
- skills: string[] (relevant skills, 3-8 items)
- deliverables: string or null
- duration: string or null
- tags: string[] (relevant tags like genre, industry, 3-6 items)
- barter_offering: string or null (what they offer in exchange, for barter type)
- barter_requesting: string or null (what they need, for barter type)
- platform_requirements: string[] or null (instagram, tiktok, youtube if mentioned)
- min_followers: number or null
- cover_image_prompt: string (a detailed prompt to generate a professional cover image for this gig listing — describe the visual style, colors, and mood that match the gig type. Keep it clean and professional, no text in image.)

Be thorough but concise. If info isn't available, use null.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (image_base64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: text ? `Extract and polish gig details from this image and text:\n${text}` : "Extract and polish gig details from this image:" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Extract and polish gig details from this text:\n\n${text}`,
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "extract_gig",
            description: "Extract structured gig/casting details with polished copy",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { type: "string", enum: ["job", "barter", "collab", "gig", "internship"] },
                description: { type: "string" },
                compensation: { type: ["string", "null"] },
                location: { type: ["string", "null"] },
                requirements: { type: ["string", "null"] },
                skills: { type: "array", items: { type: "string" } },
                deliverables: { type: ["string", "null"] },
                duration: { type: ["string", "null"] },
                tags: { type: "array", items: { type: "string" } },
                barter_offering: { type: ["string", "null"] },
                barter_requesting: { type: ["string", "null"] },
                platform_requirements: { type: ["array", "null"], items: { type: "string" } },
                min_followers: { type: ["number", "null"] },
                cover_image_prompt: { type: "string" },
              },
              required: ["title", "type", "description", "skills", "tags", "cover_image_prompt"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_gig" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const coverImagePrompt = extracted.cover_image_prompt;
    delete extracted.cover_image_prompt;

    // Step 2: Generate cover image
    let imageUrl: string | null = null;
    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Create a professional, visually striking cover image for a creative gig listing. ${coverImagePrompt}. The image should be clean, modern, and suitable as a banner. No text or words in the image. Aspect ratio 16:9.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (base64Image) {
          // Upload to Supabase Storage
          const imageBytes = Uint8Array.from(atob(base64Image.split(",")[1]), c => c.charCodeAt(0));
          const fileName = `gig-covers/${crypto.randomUUID()}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from("opportunities")
            .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("opportunities").getPublicUrl(fileName);
            imageUrl = urlData?.publicUrl || null;
          } else {
            console.error("Image upload error:", uploadError);
          }
        }
      } else {
        console.error("Image generation failed:", imageResponse.status);
      }
    } catch (imgErr) {
      console.error("Image generation error:", imgErr);
      // Non-fatal - continue without image
    }

    // Step 3: Create the opportunity
    const claimToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const { data: opp, error: insertError } = await supabase
      .from("opportunities")
      .insert({
        ...extracted,
        status: "active",
        created_by: user.id,
        scouted_by: user.id,
        claim_token: claimToken,
        claim_status: "unclaimed",
        original_source_text: text || "Screenshot upload",
        source_platform: source_platform || "unknown",
        ...(imageUrl ? { image_url: imageUrl } : {}),
      })
      .select("id, claim_token")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create opportunity");
    }

    return new Response(JSON.stringify({
      success: true,
      opportunity: opp,
      extracted,
      has_cover_image: !!imageUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-gig-details error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
