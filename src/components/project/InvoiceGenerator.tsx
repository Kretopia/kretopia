import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";

interface InvoiceGeneratorProps {
  projectId: string;
}

export function InvoiceGenerator({ projectId }: InvoiceGeneratorProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Invoices</h3>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No invoices yet</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-3 border rounded-lg">
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-sm">${Number(inv.total_amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
