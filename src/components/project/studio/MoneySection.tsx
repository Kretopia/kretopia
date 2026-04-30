import { useEffect, useState } from "react";
import { Wallet, Loader2, FileText, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MoneySectionProps {
  project: {
    id: string;
    client_price?: number | null;
    creative_payout?: number | null;
    currency?: string | null;
    deal_type?: string | null;
  };
  isOwner: boolean;
  onOpenInvoice: () => void;
}

interface InvoiceLite {
  id: string;
  status: string;
  total_amount: number | null;
}

const fmt = (n: number | null | undefined, ccy: string | null | undefined) => {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (ccy || "USD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${ccy || "$"} ${n.toLocaleString()}`;
  }
};

export const MoneySection = ({ project, isOwner, onOpenInvoice }: MoneySectionProps) => {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceLite | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("invoices")
          .select("id, status, total_amount")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setInvoice((data as unknown as InvoiceLite) ?? null);
      } catch (e) {
        console.error("[MoneySection] fetch invoice", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const value = project.client_price ?? project.creative_payout ?? null;
  const isPaid = invoice?.status === "paid";
  const isSent = invoice && !isPaid;

  const markPaid = async () => {
    if (!invoice) return;
    setMarking(true);
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoice.id);
    setMarking(false);
    if (!error) setInvoice({ ...invoice, status: "paid" });
  };

  return (
    <section className="px-4 py-5 space-y-3">
      <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
        The Money
      </h2>

      <div className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Project value</p>
            <p className="text-2xl font-bold leading-tight">{fmt(value, project.currency)}</p>
          </div>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Invoice</p>
            <p className="font-semibold flex items-center gap-1 mt-0.5">
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : invoice ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-primary" /> Sent
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3 text-muted-foreground" /> Not sent
                </>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment</p>
            <p
              className={cn(
                "font-semibold flex items-center gap-1 mt-0.5",
                isPaid && "text-primary"
              )}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isPaid ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Paid
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3 text-muted-foreground" /> Pending
                </>
              )}
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        {isOwner && (
          isPaid ? (
            <Button disabled className="w-full gap-2" variant="secondary">
              <CheckCircle2 className="h-4 w-4" /> Paid ✓
            </Button>
          ) : isSent ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-1.5" onClick={onOpenInvoice}>
                <FileText className="h-4 w-4" /> View
              </Button>
              <Button onClick={markPaid} disabled={marking} className="gap-1.5">
                {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark Paid
              </Button>
            </div>
          ) : (
            <Button onClick={onOpenInvoice} className="w-full gap-2">
              <FileText className="h-4 w-4" /> Send Invoice
            </Button>
          )
        )}
      </div>
    </section>
  );
};
