import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, DollarSign, Calendar, User } from "lucide-react";

interface InvoiceItem {
  description: string;
  amount: number;
}

interface InvoiceGeneratorProps {
  projectTitle: string;
  projectId: string;
  milestones?: any[];
  userProfile?: any;
}

export function InvoiceGenerator({ projectTitle, projectId, milestones = [], userProfile }: InvoiceGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    clientName: "",
    clientEmail: "",
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    items: [] as InvoiceItem[],
    notes: "",
  });
  const { toast } = useToast();

  const handleAddMilestoneItems = () => {
    const milestoneItems = milestones
      .filter(m => m.status === 'completed' || m.status === 'review')
      .map(m => ({
        description: m.title,
        amount: Number(m.amount)
      }));
    setInvoiceData({ ...invoiceData, items: milestoneItems });
  };

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, { description: "", amount: 0 }]
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...invoiceData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const removeItem = (index: number) => {
    setInvoiceData({
      ...invoiceData,
      items: invoiceData.items.filter((_, i) => i !== index)
    });
  };

  const calculateTotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const generateInvoiceHTML = () => {
    const total = calculateTotal();
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 700; color: #3b82f6; }
    .invoice-details { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: 600; color: #1e40af; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .amount { text-align: right; }
    .total-row { font-weight: 700; font-size: 18px; background: #f9fafb; }
    .total-row td { border-top: 2px solid #3b82f6; padding-top: 16px; }
    .notes { background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    .badge { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1e40af; border-radius: 12px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ThriveIN</div>
      <div style="margin-top: 8px; color: #6b7280;">Creative Platform</div>
    </div>
    <div class="invoice-details">
      <div class="invoice-number">INVOICE</div>
      <div style="margin-top: 4px; font-size: 14px; color: #6b7280;">#${invoiceData.invoiceNumber}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
    <div class="section">
      <div class="section-title">From</div>
      <div style="font-weight: 600; margin-bottom: 4px;">${userProfile?.full_name || 'Service Provider'}</div>
      <div style="color: #6b7280; font-size: 14px;">${userProfile?.role || 'Creator'}</div>
      ${userProfile?.location ? `<div style="color: #6b7280; font-size: 14px;">${userProfile.location}</div>` : ''}
    </div>
    <div class="section">
      <div class="section-title">Bill To</div>
      <div style="font-weight: 600; margin-bottom: 4px;">${invoiceData.clientName}</div>
      <div style="color: #6b7280; font-size: 14px;">${invoiceData.clientEmail}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px;">
    <div class="section">
      <div class="section-title">Project</div>
      <div style="font-weight: 600;">${projectTitle}</div>
    </div>
    <div class="section">
      <div class="section-title">Issue Date</div>
      <div style="font-weight: 600;">${new Date(invoiceData.issueDate).toLocaleDateString()}</div>
    </div>
    <div class="section">
      <div class="section-title">Due Date</div>
      <div style="font-weight: 600;">${invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'Upon Receipt'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="amount">$${Number(item.amount).toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>Total Amount Due</td>
        <td class="amount">$${total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  ${invoiceData.notes ? `
    <div class="notes">
      <div class="section-title">Notes</div>
      <div style="color: #374151;">${invoiceData.notes}</div>
    </div>
  ` : ''}

  <div class="footer">
    <div style="margin-bottom: 8px;"><span class="badge">Powered by ThriveIN</span></div>
    <div>Thank you for your business!</div>
  </div>
</body>
</html>
    `;
  };

  const downloadInvoice = () => {
    if (!invoiceData.clientName || invoiceData.items.length === 0) {
      toast({
        title: "Missing information",
        description: "Please add client name and at least one item",
        variant: "destructive"
      });
      return;
    }

    const html = generateInvoiceHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${invoiceData.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Invoice generated! 📄",
      description: "Download started successfully"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input
                value={invoiceData.clientName}
                onChange={(e) => setInvoiceData({ ...invoiceData, clientName: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input
                type="email"
                value={invoiceData.clientEmail}
                onChange={(e) => setInvoiceData({ ...invoiceData, clientEmail: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={invoiceData.issueDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, issueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invoice Items</Label>
              <div className="flex gap-2">
                {milestones.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMilestoneItems}
                  >
                    Import Milestones
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  Add Item
                </Button>
              </div>
            </div>
            <div className="space-y-2 border rounded-lg p-3">
              {invoiceData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items yet. Add items or import from milestones.
                </p>
              ) : (
                invoiceData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))
              )}
              {invoiceData.items.length > 0 && (
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-semibold">Total:</span>
                  <Badge variant="secondary" className="text-lg">
                    ${calculateTotal().toFixed(2)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
              placeholder="Payment terms, thank you note, etc."
              rows={3}
            />
          </div>

          <Button onClick={downloadInvoice} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download Invoice (HTML)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}