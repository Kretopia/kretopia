import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Mail, Download, Eye } from "lucide-react";
import { toast } from "sonner";

interface InvoiceGeneratorProps {
  projectId: string;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];

export function InvoiceGenerator({ projectId }: InvoiceGeneratorProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [issuedTo, setIssuedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, profiles!invoices_issued_to_fkey(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "rate") {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (parseFloat(taxRate) / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateInvoice = async () => {
    if (!issuedTo || lineItems.some(item => !item.description)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();

      // Generate temporary invoice number - will be replaced by database trigger
      const tempInvoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;

      const invoiceData: InvoiceInsert = {
        invoice_number: tempInvoiceNumber,
        project_id: projectId,
        issued_by: user?.id!,
        issued_to: issuedTo,
        amount: subtotal,
        tax_rate: parseFloat(taxRate),
        tax_amount: tax,
        total_amount: total,
        due_date: dueDate || null,
        notes,
        line_items: lineItems as any,
        status: "draft"
      };

      const { error } = await supabase.from("invoices").insert(invoiceData);

      if (error) throw error;

      toast.success("Invoice created successfully!");
      setShowCreateDialog(false);
      fetchInvoices();
      resetForm();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIssuedTo("");
    setDueDate("");
    setTaxRate("0");
    setNotes("");
    setLineItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleSendInvoice = async (invoiceId: string) => {
    toast.info("Email sending functionality coming soon!");
  };

  const handleDownloadPDF = async (invoice: any) => {
    toast.info("PDF generation coming soon!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issuedTo">Issued To *</Label>
                    <Input
                      id="issuedTo"
                      value={issuedTo}
                      onChange={(e) => setIssuedTo(e.target.value)}
                      placeholder="User ID or email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Line Items *</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={`$${item.amount.toFixed(2)}`}
                          disabled
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${calculateTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment terms, additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={loading}>
                    Create Invoice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No invoices yet</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      To: {inv.profiles?.full_name || "Unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(inv.total_amount).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      inv.status === "paid" ? "bg-green-100 text-green-800" :
                      inv.status === "sent" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(inv)}>
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSendInvoice(inv.id)}>
                    <Mail className="h-3 w-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
