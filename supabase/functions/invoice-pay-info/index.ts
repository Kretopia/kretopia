// Public read of a payable invoice. Used by /pay/invoice/:id
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("id");
    if (!invoiceId) throw new Error("id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice } = await admin
      .from("invoices")
      .select("id, invoice_number, issued_by, recipient_name, total_amount, currency, status, due_date, notes, brand_name, brand_logo_url, brand_color, document_type, line_items")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invoice.document_type === "quote") {
      return new Response(JSON.stringify({ error: "Quotes can't be paid online" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark viewed (best effort)
    if (invoice.status === "sent") {
      await admin.from("invoices").update({ viewed_at: new Date().toISOString() }).eq("id", invoiceId);
    }

    return new Response(JSON.stringify({ invoice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
