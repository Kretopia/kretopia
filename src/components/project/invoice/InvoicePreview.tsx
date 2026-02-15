import { InvoiceBranding } from "./InvoiceBrandingForm";
import { PaymentConfig } from "./InvoicePaymentForm";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoicePreviewProps {
  branding: InvoiceBranding;
  recipient: { name: string; email: string; address: string };
  invoiceNumber: string;
  dueDate: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: { type: string; value: number; amount: number };
  notes: string;
  payment: PaymentConfig;
  currency?: string;
}

export function InvoicePreview({
  branding, recipient, invoiceNumber, dueDate,
  lineItems, taxRate, discount, notes, payment, currency = "USD"
}: InvoicePreviewProps) {
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const discountAmt = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.amount;
  const afterDiscount = subtotal - discountAmt;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;

  const fmt = (n: number) => {
    const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : `${currency} `;
    return `${sym}${n.toFixed(2)}`;
  };

  return (
    <Card className="p-0 overflow-hidden shadow-lg border-0">
      {/* Accent bar */}
      <div className="h-2" style={{ backgroundColor: branding.brand_color }} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {branding.brand_logo_url && (
              <img src={branding.brand_logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain" />
            )}
            <div>
              <h2 className="font-bold text-lg">{branding.brand_name || "Your Business"}</h2>
              {branding.brand_email && <p className="text-xs text-muted-foreground">{branding.brand_email}</p>}
              {branding.brand_address && <p className="text-xs text-muted-foreground">{branding.brand_address}</p>}
              {branding.brand_website && <p className="text-xs text-muted-foreground">{branding.brand_website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: branding.brand_color }}>INVOICE</h1>
            <p className="text-xs text-muted-foreground font-mono">{invoiceNumber || "INV-DRAFT"}</p>
            {dueDate && (
              <p className="text-xs mt-1">
                <span className="text-muted-foreground">Due: </span>
                <span className="font-medium">{new Date(dueDate).toLocaleDateString()}</span>
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Bill To */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Bill To</p>
          <p className="font-medium text-sm">{recipient.name || "Client Name"}</p>
          {recipient.email && <p className="text-xs text-muted-foreground">{recipient.email}</p>}
          {recipient.address && <p className="text-xs text-muted-foreground">{recipient.address}</p>}
        </div>

        {/* Line Items Table */}
        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: branding.brand_color + "15" }}>
                <th className="text-left p-2.5 font-semibold text-xs">Description</th>
                <th className="text-center p-2.5 font-semibold text-xs w-16">Qty</th>
                <th className="text-right p-2.5 font-semibold text-xs w-24">Rate</th>
                <th className="text-right p-2.5 font-semibold text-xs w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2.5 text-xs">{item.description || "—"}</td>
                  <td className="p-2.5 text-xs text-center">{item.quantity}</td>
                  <td className="p-2.5 text-xs text-right">{fmt(item.rate)}</td>
                  <td className="p-2.5 text-xs text-right font-medium">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount {discount.type === "percentage" ? `(${discount.value}%)` : ""}</span>
                <span>-{fmt(discountAmt)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{fmt(tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span style={{ color: branding.brand_color }}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {payment.payment_method && (
          <div className="rounded-lg p-3 bg-muted/40 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Payment Method</p>
            {payment.payment_method === "thrivepay" && (
              <p className="text-xs font-medium" style={{ color: branding.brand_color }}>
                💳 Pay securely via ThrivePay — link will be included in email
              </p>
            )}
            {payment.payment_method === "bank_transfer" && (
              <div className="text-xs space-y-0.5">
                {payment.payment_details.bank_name && <p>Bank: {payment.payment_details.bank_name}</p>}
                {payment.payment_details.account_name && <p>Account: {payment.payment_details.account_name}</p>}
                {payment.payment_details.account_number && <p>Number: {payment.payment_details.account_number}</p>}
                {payment.payment_details.routing_number && <p>Routing/SWIFT: {payment.payment_details.routing_number}</p>}
              </div>
            )}
            {payment.payment_method === "paypal" && (
              <p className="text-xs">PayPal: {payment.payment_details.paypal_email}</p>
            )}
            {payment.payment_method === "other" && (
              <p className="text-xs whitespace-pre-wrap">{payment.payment_details.instructions}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Notes</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {payment.terms_conditions && (
          <div className="pt-2 border-t">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Terms & Conditions</p>
            <p className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{payment.terms_conditions}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t">
          <p className="text-[10px] text-muted-foreground">
            Thank you for your business! • Powered by ThriveIN
          </p>
        </div>
      </div>
    </Card>
  );
}
