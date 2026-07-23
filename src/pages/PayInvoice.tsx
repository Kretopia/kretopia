import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n);

export default function PayInvoice() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const status = sp.get("status");
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(
          `https://kwmcocsitwssrtzkdojh.supabase.co/functions/v1/invoice-pay-info?id=${encodeURIComponent(id)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Invoice not available");
        setInvoice(json.invoice);
      } catch (e: any) {
        setError(e?.message || "Couldn't load invoice");
      } finally {
        setLoading(false);
      }
    })().catch(() => {});
  }, [id]);

  const handlePay = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-invoice-checkout", {
        body: { invoice_id: id, payer_email: invoice?.recipient_email },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Checkout unavailable");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Couldn't start checkout");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <SEO title="Invoice paid" description="Thanks for your payment" />
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-[hsl(var(--energy-lime))] mx-auto" />
          <h1 className="text-2xl font-serif">Invoice paid</h1>
          <p className="text-muted-foreground">Thanks — the sender has been notified.</p>
          <Button asChild className="w-full"><Link to="/">Back to Kretopia</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">{error}</h1>
        </CardContent></Card>
      </div>
    );
  }
  if (!invoice) return null;

  const total = Number(invoice.total_amount);
  const alreadyPaid = invoice.status === "paid";

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 flex items-center justify-center">
      <SEO title={`Pay invoice ${invoice.invoice_number}`} description={`Invoice from ${invoice.brand_name || "Kretopia"}`} />
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            {invoice.brand_logo_url && <img src={invoice.brand_logo_url} alt="" className="h-12 mx-auto object-contain" />}
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice from</p>
            <p className="font-semibold">{invoice.brand_name || "Kretopia creator"}</p>
          </div>

          <div className="text-center py-4 border-y space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice #{invoice.invoice_number}</p>
            <p className="text-4xl font-bold">{fmt(total, invoice.currency)}</p>
            {invoice.due_date && (
              <p className="text-xs text-muted-foreground">Due {new Date(invoice.due_date).toLocaleDateString()}</p>
            )}
          </div>

          {invoice.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {alreadyPaid ? (
            <div className="text-center text-sm text-[hsl(var(--energy-lime))] font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Already paid
            </div>
          ) : (
            <Button onClick={handlePay} disabled={submitting} className="w-full h-12 text-base">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Pay {fmt(total, invoice.currency)}
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Powered by ThrivePay · Card, Apple Pay, Google Pay
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
