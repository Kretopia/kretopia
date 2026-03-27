import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { partnerSubmissionSchema, validateInput, checkContentLength } from '../_shared/validation.ts';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const submissionData = await req.json();

    console.log('Processing partner submission:', submissionData.company_name);

    // Use AI to categorize the company
    const aiPrompt = `Analyze this company and categorize it into ONE of these categories: coworking, software, equipment, services, wellness, education, cafe, other.

Company Name: ${submissionData.company_name}
Description: ${submissionData.description}
Website: ${submissionData.website_url || 'Not provided'}

Return ONLY the category name (lowercase, one word). Examples: "cafe", "coworking", "software", "services"`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
      }),
    });

    let aiCategory = submissionData.category; // fallback to user-selected
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const suggestedCategory = aiData.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate AI response
      const validCategories = ['coworking', 'software', 'equipment', 'services', 'wellness', 'education', 'cafe', 'other'];
      if (validCategories.includes(suggestedCategory)) {
        aiCategory = suggestedCategory;
        console.log('AI categorized as:', aiCategory);
      }
    }

    // Auto-approve: Insert directly into partner_discounts
    const { data: discount, error: discountError } = await supabase
      .from('partner_discounts')
      .insert({
        partner_name: submissionData.company_name,
        partner_logo_url: submissionData.logo_url,
        discount_type: submissionData.discount_type,
        discount_value: submissionData.discount_value,
        description: submissionData.description,
        terms: submissionData.terms,
        category: aiCategory,
        tier_required: submissionData.tier_required,
        redemption_url: submissionData.redemption_url,
        redemption_code: submissionData.redemption_code,
        is_active: true
      })
      .select()
      .single();

    if (discountError) {
      console.error('Error creating discount:', discountError);
      throw discountError;
    }

    // Record in submissions table as approved
    const { error: submissionError } = await supabase
      .from('partner_submissions')
      .insert({
        ...submissionData,
        category: aiCategory,
        status: 'approved',
        reviewed_at: new Date().toISOString()
      });

    if (submissionError) {
      console.error('Error recording submission:', submissionError);
      // Don't throw - discount already created
    }

    console.log('Partner auto-approved successfully:', submissionData.company_name);

    return new Response(
      JSON.stringify({
        success: true,
        category: aiCategory,
        discount_id: discount.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-partner-submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process submission';
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});