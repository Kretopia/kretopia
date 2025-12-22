import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate admin secret - this function should only be called by admins
  const adminSecret = req.headers.get("x-admin-secret");
  const expectedSecret = Deno.env.get("ADMIN_SECRET");
  
  if (expectedSecret && adminSecret !== expectedSecret) {
    console.error("Unauthorized: Invalid or missing admin secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email address is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Sending test emails to: ${email}`);

    // 1. Welcome Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'welcome',
        data: {
          userName: 'Test User',
        }
      }
    });
    console.log('✅ Sent welcome email');

    // 2. Opportunity Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'opportunity',
        data: {
          userName: 'Test User',
          opportunityTitle: 'Senior Video Editor Needed',
          opportunityUrl: 'https://example.com/opportunity/123',
        }
      }
    });
    console.log('✅ Sent opportunity email');

    // 3. Match Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'match',
        data: {
          userName: 'Test User',
          matchName: 'John Doe',
          matchUrl: 'https://example.com/circle',
        }
      }
    });
    console.log('✅ Sent match email');

    // 4. Application Status Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'application',
        data: {
          userName: 'Test User',
          projectName: 'Music Video Production',
          applicationStatus: 'accepted',
        }
      }
    });
    console.log('✅ Sent application status email');

    // 5. Re-engagement Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 're-engagement',
        data: {
          userName: 'Test User',
          daysSinceLastVisit: 15,
          newOpportunitiesCount: 12,
        }
      }
    });
    console.log('✅ Sent re-engagement email');

    // 6. Weekly Digest Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'weekly-digest',
        data: {
          userName: 'Test User',
          opportunities: [
            { title: 'Photographer Needed for Fashion Shoot', type: 'Paid Gig' },
            { title: 'Podcast Editor - Remote', type: 'Freelance' },
            { title: 'Brand Partnership Opportunity', type: 'Collaboration' },
          ]
        }
      }
    });
    console.log('✅ Sent weekly digest email');

    // 7. Activity Digest Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'activity-digest',
        data: {
          userName: 'Test User',
          unreadCount: 8,
          matches: 2,
          messages: 3,
          opportunities: 3,
        }
      }
    });
    console.log('✅ Sent activity digest email');

    // 8. Streak Warning Email
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: email,
        type: 'streak-warning',
        data: {
          userName: 'Test User',
          streakCount: 15,
        }
      }
    });
    console.log('✅ Sent streak warning email');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully sent 8 test emails to ${email}`,
        emailTypes: [
          'welcome',
          'opportunity',
          'match',
          'application',
          're-engagement',
          'weekly-digest',
          'activity-digest',
          'streak-warning'
        ]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error sending test emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
