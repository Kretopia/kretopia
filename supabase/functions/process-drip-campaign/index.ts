import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const baseUrl = 'https://www.thrivein.io';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    
    const resend = new Resend(resendKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("authorization");
    let isAdmin = false;

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: hasRole } = await supabaseAdmin.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        isAdmin = hasRole === true;
      }
    }

    // Also allow cron
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && cronSecret === expectedSecret) isAdmin = true;

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, campaign_id, segment_id, contacts, segment_name, segment_description, subject, email_body, cta_text, cta_url, daily_limit } = body;

    // --- Action: Create/update segment ---
    if (action === 'create_segment') {
      const { data, error } = await supabaseAdmin
        .from('email_segments')
        .upsert({ name: segment_name, description: segment_description || null }, { onConflict: 'name' })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ segment: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Action: Import contacts ---
    if (action === 'import_contacts') {
      if (!segment_id || !contacts?.length) {
        return new Response(JSON.stringify({ error: "segment_id and contacts required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < contacts.length; i += chunkSize) {
        const chunk = contacts.slice(i, i + chunkSize).map((c: any) => ({
          email: c.email?.toLowerCase()?.trim(),
          name: c.name?.trim() || null,
          segment_id,
          status: 'active',
        })).filter((c: any) => c.email);

        const { data, error } = await supabaseAdmin
          .from('email_contacts')
          .upsert(chunk, { onConflict: 'email,segment_id', ignoreDuplicates: true })
          .select();

        if (error) {
          console.error(`[import] Chunk error:`, error);
          errors += chunk.length;
        } else {
          imported += data?.length || 0;
          duplicates += chunk.length - (data?.length || 0);
        }
      }

      // Update contact count
      const { count } = await supabaseAdmin
        .from('email_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('segment_id', segment_id)
        .eq('status', 'active');

      await supabaseAdmin
        .from('email_segments')
        .update({ contact_count: count || 0 })
        .eq('id', segment_id);

      return new Response(JSON.stringify({ imported, duplicates, errors, total: count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Action: Create campaign ---
    if (action === 'create_campaign') {
      if (!segment_id || !subject || !email_body) {
        return new Response(JSON.stringify({ error: "segment_id, subject, and email_body required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Count contacts in segment
      const { count } = await supabaseAdmin
        .from('email_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('segment_id', segment_id)
        .eq('status', 'active');

      const { data: campaign, error } = await supabaseAdmin
        .from('drip_campaigns')
        .insert({
          segment_id,
          subject,
          body: email_body,
          cta_text: cta_text || 'Visit ThriveIN →',
          cta_url: cta_url || baseUrl,
          daily_limit: daily_limit || 95,
          total_contacts: count || 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Queue all active contacts from this segment
      const { data: segContacts } = await supabaseAdmin
        .from('email_contacts')
        .select('id')
        .eq('segment_id', segment_id)
        .eq('status', 'active');

      if (segContacts?.length) {
        const sends = segContacts.map(c => ({
          campaign_id: campaign.id,
          contact_id: c.id,
          status: 'pending',
        }));

        // Insert in chunks
        for (let i = 0; i < sends.length; i += 500) {
          await supabaseAdmin.from('drip_campaign_sends').insert(sends.slice(i, i + 500));
        }
      }

      return new Response(JSON.stringify({ campaign, queued: segContacts?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Action: Process batch (send next batch of emails) ---
    if (action === 'process_batch') {
      // Find active campaigns
      const { data: campaigns } = await supabaseAdmin
        .from('drip_campaigns')
        .select('*')
        .eq('status', 'active');

      if (!campaigns?.length) {
        return new Response(JSON.stringify({ message: "No active campaigns" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const campaign of campaigns) {
        // Get pending sends for this campaign, limited by daily_limit
        const { data: pendingSends } = await supabaseAdmin
          .from('drip_campaign_sends')
          .select('id, contact_id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')
          .limit(campaign.daily_limit);

        if (!pendingSends?.length) {
          // Mark campaign as completed
          await supabaseAdmin
            .from('drip_campaigns')
            .update({ status: 'completed' })
            .eq('id', campaign.id);
          continue;
        }

        // Get contact details
        const contactIds = pendingSends.map(s => s.contact_id);
        const { data: contactDetails } = await supabaseAdmin
          .from('email_contacts')
          .select('id, email, name')
          .in('id', contactIds);

        const contactMap = new Map(contactDetails?.map(c => [c.id, c]) || []);

        const formatBody = (text: string) => {
          return text.split('\n').filter(line => line.trim()).map(line =>
            `<p style="font-size: 16px; line-height: 1.8; color: #e0e0e0; margin: 0 0 16px 0;">${line}</p>`
          ).join('');
        };

        for (const send of pendingSends) {
          const contact = contactMap.get(send.contact_id);
          if (!contact) continue;

          try {
            const emailHtml = `
              <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #4338CA; font-size: 28px; margin: 0;">ThriveIN</h1>
                  <p style="color: #a0a0a0; font-size: 12px; margin-top: 4px;">Verified Credits · Real Gigs · Get Paid</p>
                </div>
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 20px;">Hi ${contact.name || 'Creative'},</p>
                ${formatBody(campaign.body)}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${campaign.cta_url}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4338CA, #6366f1); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
                    ${campaign.cta_text}
                  </a>
                </div>
                <p style="margin-top: 30px; color: #a0a0a0;">
                  — Ethan Auguste<br>
                  <strong style="color: #4338CA;">Founder, ThriveIN</strong>
                </p>
                <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 20px; text-align: center;">
                  <p style="color: #666; font-size: 12px; margin: 0;">
                    <a href="${baseUrl}/notification-settings" style="color: #4338CA; text-decoration: none;">Manage email preferences</a>
                  </p>
                </div>
              </div>
            `;

            const { error: emailError } = await resend.emails.send({
              from: "ThriveIN <noreply@thrivein.io>",
              to: [contact.email],
              subject: campaign.subject,
              html: emailHtml,
            });

            if (emailError) {
              await supabaseAdmin.from('drip_campaign_sends').update({
                status: 'failed',
                error_message: emailError.message,
                sent_at: new Date().toISOString(),
              }).eq('id', send.id);
              totalFailed++;
            } else {
              await supabaseAdmin.from('drip_campaign_sends').update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              }).eq('id', send.id);
              totalSent++;
            }

            // Rate limit: 100ms between sends
            await new Promise(r => setTimeout(r, 100));
          } catch (err: any) {
            await supabaseAdmin.from('drip_campaign_sends').update({
              status: 'failed',
              error_message: err.message,
              sent_at: new Date().toISOString(),
            }).eq('id', send.id);
            totalFailed++;
          }
        }

        // Update campaign counts
        const { count: sentCount } = await supabaseAdmin
          .from('drip_campaign_sends')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'sent');

        const { count: failedCount } = await supabaseAdmin
          .from('drip_campaign_sends')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'failed');

        await supabaseAdmin.from('drip_campaigns').update({
          sent_count: sentCount || 0,
          failed_count: failedCount || 0,
          last_batch_at: new Date().toISOString(),
        }).eq('id', campaign.id);
      }

      return new Response(JSON.stringify({ sent: totalSent, failed: totalFailed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Action: Pause/Resume campaign ---
    if (action === 'pause_campaign' || action === 'resume_campaign') {
      const newStatus = action === 'pause_campaign' ? 'paused' : 'active';
      await supabaseAdmin.from('drip_campaigns').update({ status: newStatus }).eq('id', campaign_id);
      return new Response(JSON.stringify({ success: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Action: Get stats ---
    if (action === 'get_stats') {
      const { data: segments } = await supabaseAdmin.from('email_segments').select('*').order('created_at', { ascending: false });
      const { data: campaigns } = await supabaseAdmin.from('drip_campaigns').select('*, email_segments(name)').order('created_at', { ascending: false });
      return new Response(JSON.stringify({ segments, campaigns }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[process-drip-campaign] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

serve(handler);
