import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, token, roleId, projectId, brandEmail, brandName, submittedBy } = await req.json();

    if (action === 'request') {
      // Creator requests brand verification
      if (!roleId || !projectId || !brandEmail || !brandName || !submittedBy) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase.from('icdb_brand_verifications').insert({
        project_id: projectId,
        role_id: roleId,
        brand_name: brandName,
        brand_email: brandEmail,
        submitted_by: submittedBy,
      }).select('verification_token').single();

      if (error) throw error;

      // In production: send email to brand with verification link
      // For now, return the token
      return new Response(JSON.stringify({ 
        success: true, 
        token: data.verification_token,
        message: `Verification request sent to ${brandEmail}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      // Brand confirms credit via token
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: verification, error: fetchErr } = await supabase
        .from('icdb_brand_verifications')
        .select('*, icdb_project_roles(id, claimed_by), icdb_projects(title)')
        .eq('verification_token', token)
        .eq('status', 'pending')
        .single();

      if (fetchErr || !verification) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark as verified
      await supabase.from('icdb_brand_verifications')
        .update({ status: 'verified', verified_at: new Date().toISOString() })
        .eq('id', verification.id);

      // Update the credit verification status if user has claimed
      if (verification.role_id) {
        const { data: role } = await supabase
          .from('icdb_project_roles')
          .select('claimed_by')
          .eq('id', verification.role_id)
          .single();

        if (role?.claimed_by) {
          // Update user's credit to brand-verified
          await supabase.from('credits')
            .update({ verification_status: 'verified', verified_by_name: verification.brand_name })
            .eq('user_id', role.claimed_by)
            .ilike('project_name', `%${(verification as any).icdb_projects?.title || ''}%`);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        project: (verification as any).icdb_projects?.title,
        brand: verification.brand_name
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Brand verification error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
