import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Landmark, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded?: () => void;
}

const COUNTRIES = [
  { code: "US", currency: "USD", routingLabel: "Routing number (ABA)", routingRequired: true, accountLabel: "Account number" },
  { code: "CA", currency: "CAD", routingLabel: "Transit + Institution (XXXXX-YYY)", routingRequired: true, accountLabel: "Account number" },
  { code: "GB", currency: "GBP", routingLabel: "Sort code (XX-XX-XX)", routingRequired: true, accountLabel: "Account number" },
  { code: "AU", currency: "AUD", routingLabel: "BSB", routingRequired: true, accountLabel: "Account number" },
  { code: "DE", currency: "EUR", routingLabel: "", routingRequired: false, accountLabel: "IBAN" },
  { code: "FR", currency: "EUR", routingLabel: "", routingRequired: false, accountLabel: "IBAN" },
  { code: "NL", currency: "EUR", routingLabel: "", routingRequired: false, accountLabel: "IBAN" },
  { code: "ES", currency: "EUR", routingLabel: "", routingRequired: false, accountLabel: "IBAN" },
];

export function WalletAddBankSheet({ open, onOpenChange, onAdded }: Props) {
  const { toast } = useToast();
  const [country, setCountry] = useState("US");
  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routing, setRouting] = useState("");
  const [loading, setLoading] = useState(false);
  const cfg = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  useEffect(() => {
    setRouting("");
    setAccountNumber("");
  }, [country]);

  const submit = async () => {
    if (!holder || !accountNumber || (cfg.routingRequired && !routing)) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wallet-add-bank", {
        body: {
          country,
          currency: cfg.currency,
          account_holder_name: holder,
          account_number: accountNumber.replace(/\s+/g, ""),
          routing_number: cfg.routingRequired ? routing.replace(/[-\s]+/g, "") : undefined,
          make_default: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Bank added", description: "You can now get paid." });
      onAdded?.();
      onOpenChange(false);
      setHolder(""); setAccountNumber(""); setRouting("");
    } catch (e: any) {
      toast({ title: "Couldn't add bank", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Add your bank
          </SheetTitle>
          <SheetDescription>Get paid directly into your account. No third-party signup.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} · {c.currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account holder name</Label>
            <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Full name on the account" />
          </div>

          {cfg.routingRequired && (
            <div className="space-y-2">
              <Label>{cfg.routingLabel}</Label>
              <Input value={routing} onChange={(e) => setRouting(e.target.value)} inputMode="numeric" />
            </div>
          )}

          <div className="space-y-2">
            <Label>{cfg.accountLabel}</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" />
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>Bank details are encrypted and processed by our payment partner. ThriveIN never stores your full account number.</p>
          </div>

          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : "Save bank account"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
