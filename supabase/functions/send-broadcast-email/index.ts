import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = 'https://8bc8181d-6585-46a0-82d6-4570d2fbb82c.lovableproject.com';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    // Verify admin access via cron secret or check if user is admin
    const authHeader = req.headers.get("authorization");
    let isAdmin = cronSecret === expectedSecret;
    
    if (!isAdmin && authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: hasRole } = await supabaseAdmin.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        isAdmin = hasRole === true;
      }
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`[send-broadcast-email] Found ${profiles?.length || 0} users to email`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process users in batches to avoid rate limits
    for (const profile of profiles || []) {
      try {
        // Get user email
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        if (!userData?.user?.email) {
          console.log(`[send-broadcast-email] No email for user ${profile.user_id}`);
          continue;
        }

        const userName = profile.full_name || 'Creative';
        const email = userData.user.email;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; font-size: 32px; margin: 0;">🎄 Merry Christmas! 🎄</h1>
              <p style="color: #a0a0a0; font-size: 14px; margin-top: 8px;">From the ThriveIN Team</p>
            </div>
            
            <p style="font-size: 18px; line-height: 1.6;">Hi ${userName},</p>
            
            <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
              We hope you're having a wonderful holiday season! 🎁
            </p>
            
            <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
              We've been working hard on ThriveIN and are excited to share some <strong style="color: #8B5CF6;">major platform upgrades</strong>:
            </p>
            
            <div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h3 style="color: #8B5CF6; margin: 0 0 15px 0;">✨ What's New</h3>
              <ul style="margin: 0; padding-left: 20px; line-height: 2;">
                <li><strong>Swipe to Match</strong> - Find collaborators Tinder-style! Swipe right on creatives you want to work with</li>
                <li><strong>AI-Powered Matching</strong> - Get personalized creator recommendations based on your skills & interests</li>
                <li><strong>Project Workspaces</strong> - Collaborate in real-time with tasks, files, chat & milestones</li>
                <li><strong>Verified Credits</strong> - Import & verify your work from IMDB, Spotify, YouTube & more</li>
                <li><strong>Portfolio Showcase</strong> - Display your best work with audio, video & image support</li>
                <li><strong>Opportunities Board</strong> - Post & apply for creative gigs, collabs & paid work</li>
                <li><strong>In-App Messaging</strong> - Connect instantly with your matches</li>
                <li><strong>XP & Levels</strong> - Earn rewards for being active on the platform</li>
              </ul>
            </div>
            
            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 20px; margin: 25px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #22c55e;">
                <strong>🚀 Complete your profile to get discovered!</strong>
              </p>
              <p style="margin: 0; font-size: 14px; color: #a0a0a0;">
                Add your skills, portfolio & bio so other creatives can find and match with you.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/profile" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #8B5CF6, #6366f1); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                Complete My Profile →
              </a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
              We're building the ultimate platform for creatives to find each other, collaborate, and thrive together. 
              Your feedback means everything to us – reply to this email anytime!
            </p>
            
            <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
              Wishing you a creative and prosperous New Year! 🎆
            </p>
            
            <p style="margin-top: 30px; color: #a0a0a0;">
              With love,<br>
              <strong style="color: #8B5CF6;">The ThriveIN Team</strong>
            </p>
            
            <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                <a href="${baseUrl}/notification-settings" style="color: #8B5CF6; text-decoration: none;">Manage email preferences</a>
              </p>
            </div>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "ThriveIN <noreply@thrivein.io>",
          to: [email],
          subject: "🎄 Merry Christmas from ThriveIN + Major Platform Updates!",
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[send-broadcast-email] Failed to send to ${email}:`, emailError);
          errorCount++;
          errors.push(`${email}: ${emailError.message}`);
        } else {
          console.log(`[send-broadcast-email] Sent to ${email}`);
          successCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        console.error(`[send-broadcast-email] Error processing user ${profile.user_id}:`, err);
        errorCount++;
      }
    }

    console.log(`[send-broadcast-email] Complete! Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: errorCount,
        total: profiles?.length || 0,
        errors: errors.slice(0, 10) // Only return first 10 errors
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-broadcast-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
