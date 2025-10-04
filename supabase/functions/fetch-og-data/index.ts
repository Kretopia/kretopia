import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching Open Graph data for:", url);

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ThriveBot/1.0; +https://lovable.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph tags
    const ogData: OpenGraphData = {};
    
    const extractMetaContent = (property: string): string | undefined => {
      const regex = new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
        "i"
      );
      const match = html.match(regex);
      if (match) return match[1];
      
      // Try name attribute as fallback
      const nameRegex = new RegExp(
        `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
        "i"
      );
      const nameMatch = html.match(nameRegex);
      return nameMatch ? nameMatch[1] : undefined;
    };

    ogData.title = extractMetaContent("og:title") || extractMetaContent("twitter:title");
    ogData.description = extractMetaContent("og:description") || extractMetaContent("twitter:description") || extractMetaContent("description");
    ogData.image = extractMetaContent("og:image") || extractMetaContent("twitter:image");
    ogData.url = extractMetaContent("og:url") || url;
    ogData.siteName = extractMetaContent("og:site_name");
    ogData.type = extractMetaContent("og:type");

    // If no OG title found, try to extract from <title> tag
    if (!ogData.title) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) ogData.title = titleMatch[1];
    }

    // Verify the domain for basic trust
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const isVerifiedDomain = [
      "imdb.com",
      "spotify.com",
      "youtube.com",
      "linkedin.com",
      "behance.net",
      "twitter.com",
      "x.com",
      "instagram.com",
      "forbes.com",
      "variety.com",
      "hollywoodreporter.com",
      "billboard.com",
      "rollingstone.com",
    ].some((d) => domain.includes(d));

    return new Response(
      JSON.stringify({
        success: true,
        data: ogData,
        isVerifiedDomain,
        domain,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Open Graph data:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
