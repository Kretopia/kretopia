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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { credit_id, project_name, role, year, platform } = await req.json();

    if (!credit_id || !project_name) {
      return new Response(JSON.stringify({ error: 'credit_id and project_name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build search query
    const searchTerms = [project_name, role, platform, year].filter(Boolean).join(' ');
    
    // For now, store the search query and mark as pending
    // In production, this would call a web search API
    const { data, error } = await supabase
      .from('credit_ai_verifications')
      .upsert({
        credit_id,
        search_query: searchTerms,
        status: 'pending',
        confidence_score: 0,
        evidence_links: [],
        ai_summary: `Searching for evidence of "${project_name}" (${role})...`,
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'credit_id' })
      .select()
      .single();

    if (error) throw error;

    // Update the credit's ai_confidence
    await supabase
      .from('credits')
      .update({ ai_confidence: 0 })
      .eq('id', credit_id);

    return new Response(JSON.stringify({ 
      success: true, 
      verification: data,
      message: 'Verification queued. Results will appear on your credit shortly.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in verify-credit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
