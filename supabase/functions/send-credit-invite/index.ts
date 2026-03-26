import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { credit_id, project_name, role, inviter_id, external_collaborators } = await req.json();

    if (!credit_id || !external_collaborators?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', inviter_id)
      .maybeSingle();

    const inviterName = inviterProfile?.full_name || 'A creative professional';
    const baseUrl = Deno.env.get('SITE_URL') || 'https://thrivein-new-beta.lovable.app';

    const results = [];

    for (const collab of external_collaborators) {
      const { name, email } = collab;

      // Generate a claim token
      const token = crypto.randomUUID();
      
      // Store the token in endorsements for claim tracking
      await supabase.from('credit_endorsements').update({
        token,
      }).eq('credit_id', credit_id).eq('endorser_email', email);

      const claimUrl = `${baseUrl}/auth?claim=${token}&credit=${credit_id}`;
      const whatsappText = encodeURIComponent(
        `Hey ${name}! ${inviterName} credited you as part of "${project_name}" on ThriveIN. Claim your credit and build your verified creative profile: ${claimUrl}`
      );
      const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

      // Try to send email via the transactional email system
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'credit-chain-invite',
            recipientEmail: email,
            idempotencyKey: `credit-invite-${credit_id}-${email}`,
            templateData: {
              recipientName: name,
              inviterName,
              projectName: project_name,
              role: role || 'Collaborator',
              claimUrl,
              whatsappUrl,
            },
          },
        });
      } catch (emailErr) {
        // If transactional email system isn't set up, log but don't fail
        console.log('Email send skipped (system may not be configured):', emailErr);
      }

      results.push({ email, name, claim_url: claimUrl, whatsapp_url: whatsappUrl });
    }

    return new Response(JSON.stringify({ success: true, invites: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in send-credit-invite:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
