import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building, Wallet, Globe, CheckCircle2 } from "lucide-react";

export interface PaymentConfig {
  payment_method: string;
  payment_details: Record<string, string>;
  terms_conditions: string;
}

interface InvoicePaymentFormProps {
  config: PaymentConfig;
  onChange: (config: PaymentConfig) => void;
}

const DEFAULT_TERMS = `Payment Terms:
• Payment is due within 30 days of the invoice date.
• Late payments may incur a fee of 1.5% per month.
• All work remains the property of the creator until payment is received in full.
• Revisions beyond the agreed scope will be billed additionally.`;

export function InvoicePaymentForm({ config, onChange }: InvoicePaymentFormProps) {
  const { user } = useAuth();
  const [hasThrivePay, setHasThrivePay] = useState(false);

  useEffect(() => {
    checkThrivePay();
  }, [user?.id]);

  const checkThrivePay = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_account_status")
      .eq("user_id", user.id)
      .single();
    
    setHasThrivePay(data?.stripe_account_status === "active");
  };

  const updateDetail = (key: string, value: string) => {
    onChange({
      ...config,
      payment_details: { ...config.payment_details, [key]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Payment Method</h3>
      </div>

      <RadioGroup
        value={config.payment_method}
        onValueChange={(v) => onChange({ ...config, payment_method: v, payment_details: {} })}
        className="grid grid-cols-2 gap-2"
      >
        {/* ThrivePay */}
        <Label
          htmlFor="pay-thrivepay"
          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            config.payment_method === "thrivepay" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
          } ${!hasThrivePay ? "opacity-50" : ""}`}
        >
          <RadioGroupItem value="thrivepay" id="pay-thrivepay" disabled={!hasThrivePay} />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">ThrivePay</span>
              {hasThrivePay && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {hasThrivePay ? "Instant secure payments" : "Set up in ThrivePay"}
            </p>
          </div>
        </Label>

        {/* Bank Transfer */}
        <Label
          htmlFor="pay-bank"
          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            config.payment_method === "bank_transfer" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
          }`}
        >
          <RadioGroupItem value="bank_transfer" id="pay-bank" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Bank Transfer</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Wire / ACH / SWIFT</p>
          </div>
        </Label>

        {/* PayPal */}
        <Label
          htmlFor="pay-paypal"
          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            config.payment_method === "paypal" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
          }`}
        >
          <RadioGroupItem value="paypal" id="pay-paypal" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">PayPal</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Email-based payment</p>
          </div>
        </Label>

        {/* Other */}
        <Label
          htmlFor="pay-other"
          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            config.payment_method === "other" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
          }`}
        >
          <RadioGroupItem value="other" id="pay-other" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Other</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Custom instructions</p>
          </div>
        </Label>
      </RadioGroup>

      {/* Payment Details Fields */}
      {config.payment_method === "bank_transfer" && (
        <Card className="p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input className="h-8 text-sm" placeholder="Chase Bank" value={config.payment_details.bank_name || ""} onChange={(e) => updateDetail("bank_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Account Name</Label>
              <Input className="h-8 text-sm" placeholder="Your Name / Business" value={config.payment_details.account_name || ""} onChange={(e) => updateDetail("account_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input className="h-8 text-sm" placeholder="••••1234" value={config.payment_details.account_number || ""} onChange={(e) => updateDetail("account_number", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Routing / SWIFT</Label>
              <Input className="h-8 text-sm" placeholder="SWIFT / Sort Code" value={config.payment_details.routing_number || ""} onChange={(e) => updateDetail("routing_number", e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {config.payment_method === "paypal" && (
        <Card className="p-3 bg-muted/30">
          <Label className="text-xs">PayPal Email</Label>
          <Input className="h-8 text-sm" placeholder="payments@yourstudio.com" value={config.payment_details.paypal_email || ""} onChange={(e) => updateDetail("paypal_email", e.target.value)} />
        </Card>
      )}

      {config.payment_method === "other" && (
        <Card className="p-3 bg-muted/30">
          <Label className="text-xs">Payment Instructions</Label>
          <Textarea className="text-sm" placeholder="Describe how the client should pay..." rows={3} value={config.payment_details.instructions || ""} onChange={(e) => updateDetail("instructions", e.target.value)} />
        </Card>
      )}

      {/* Terms & Conditions */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Terms & Conditions</Label>
          {!config.terms_conditions && (
            <button
              type="button"
              onClick={() => onChange({ ...config, terms_conditions: DEFAULT_TERMS })}
              className="text-[10px] text-primary hover:underline"
            >
              Use default template
            </button>
          )}
        </div>
        <Textarea
          value={config.terms_conditions}
          onChange={(e) => onChange({ ...config, terms_conditions: e.target.value })}
          placeholder="Add payment terms, cancellation policy, late fees..."
          rows={4}
          className="text-sm mt-1"
        />
      </div>
    </div>
  );
}
