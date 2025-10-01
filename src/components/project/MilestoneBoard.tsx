import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, Calendar, CheckCircle2, Clock, AlertCircle, CreditCard } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  paid_to: string | null;
  paid_at: string | null;
  created_at: string;
  payment_intent_id: string | null;
  escrow_status: string;
}

interface MilestoneBoardProps {
  milestones: Milestone[];
  projectId: string;
  onUpdate: () => void;
  userRole: 'creator' | 'client';
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
  in_progress: { label: 'In Progress', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-600' },
  review: { label: 'In Review', icon: AlertCircle, color: 'bg-purple-500/10 text-purple-600' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  paid: { label: 'Paid', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-600' },
};

export function MilestoneBoard({ milestones, projectId, onUpdate, userRole }: MilestoneBoardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    amount: '',
    due_date: ''
  });
  const { toast } = useToast();

  const handleCreateMilestone = async () => {
    if (!newMilestone.title.trim() || !newMilestone.amount) {
      toast({ title: "Error", description: "Title and amount are required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('milestones')
      .insert({
        project_id: projectId,
        created_by: user?.id,
        title: newMilestone.title,
        description: newMilestone.description || null,
        amount: parseFloat(newMilestone.amount),
        due_date: newMilestone.due_date || null,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone created! 🎯" });
      setNewMilestone({ title: '', description: '', amount: '', due_date: '' });
      setCreateDialogOpen(false);
      onUpdate();
    }
  };

  const handleStatusChange = async (milestoneId: string, newStatus: string) => {
    const { error } = await supabase
      .from('milestones')
      .update({ status: newStatus })
      .eq('id', milestoneId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Milestone updated! ✅" });
      onUpdate();
    }
  };

  const handleMarkAsPaid = async (milestoneId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('milestones')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_to: user?.id
      })
      .eq('id', milestoneId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment recorded! 💰" });
      onUpdate();
    }
  };

  const handleStripePayment = async (milestone: Milestone, useEscrow: boolean = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to make a payment", variant: "destructive" });
        return;
      }

      toast({ title: useEscrow ? "Creating escrow payment..." : "Creating payment session..." });
      
      const { data, error } = await supabase.functions.invoke('create-milestone-payment', {
        body: {
          milestoneId: milestone.id,
          amount: milestone.amount,
          title: milestone.title,
          projectId: projectId,
          useEscrow: useEscrow,
        },
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({ title: useEscrow ? "Escrow payment window opened! 🔒" : "Payment window opened! 💳" });
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({ title: "Error", description: error.message || "Failed to create payment session", variant: "destructive" });
    }
  };

  const handleCapturePayment = async (milestone: Milestone) => {
    try {
      if (!milestone.payment_intent_id) {
        toast({ title: "Error", description: "No payment to capture", variant: "destructive" });
        return;
      }

      toast({ title: "Releasing escrow funds..." });

      const { data, error } = await supabase.functions.invoke('capture-milestone-payment', {
        body: {
          paymentIntentId: milestone.payment_intent_id,
          action: 'capture',
          milestoneId: milestone.id,
        },
      });

      if (error) throw error;

      toast({ title: "Funds released! 💰", description: "Payment has been transferred to the creator." });
      onUpdate();
    } catch (error: any) {
      console.error('Error capturing payment:', error);
      toast({ title: "Error", description: error.message || "Failed to capture payment", variant: "destructive" });
    }
  };

  const handleCancelPayment = async (milestone: Milestone) => {
    try {
      if (!milestone.payment_intent_id) {
        toast({ title: "Error", description: "No payment to cancel", variant: "destructive" });
        return;
      }

      toast({ title: "Cancelling escrow payment..." });

      const { data, error } = await supabase.functions.invoke('capture-milestone-payment', {
        body: {
          paymentIntentId: milestone.payment_intent_id,
          action: 'cancel',
          milestoneId: milestone.id,
        },
      });

      if (error) throw error;

      toast({ title: "Escrow cancelled", description: "Funds have been refunded." });
      onUpdate();
    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      toast({ title: "Error", description: error.message || "Failed to cancel payment", variant: "destructive" });
    }
  };

  const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
  const paidAmount = milestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + Number(m.amount), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestones & Payments</h3>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${totalAmount.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Paid: <span className="font-semibold text-green-600">${paidAmount.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Pending: <span className="font-semibold text-yellow-600">${pendingAmount.toFixed(2)}</span>
            </span>
          </div>
        </div>
        {userRole === 'client' && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Milestone</DialogTitle>
                <DialogDescription>Set up project milestones with payment amounts</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    placeholder="Milestone title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    placeholder="Milestone details and deliverables"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMilestone.amount}
                    onChange={(e) => setNewMilestone({ ...newMilestone, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newMilestone.due_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateMilestone} className="w-full">Create Milestone</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {milestones.length === 0 ? (
          <Card className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No milestones yet</p>
            {userRole === 'client' && (
              <p className="text-sm text-muted-foreground mt-2">Create your first milestone to track project payments</p>
            )}
          </Card>
        ) : (
          milestones.map((milestone) => {
            const statusConfig = STATUS_CONFIG[milestone.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={milestone.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                     <div className="flex items-center gap-2">
                       <h4 className="font-semibold">{milestone.title}</h4>
                       <Badge className={statusConfig.color}>
                         <StatusIcon className="h-3 w-3 mr-1" />
                         {statusConfig.label}
                       </Badge>
                       {milestone.escrow_status === 'authorized' && (
                         <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                           🔒 Escrow Secured
                         </Badge>
                       )}
                       {milestone.escrow_status === 'captured' && (
                         <Badge variant="secondary" className="bg-green-100 text-green-700">
                           ✓ Escrow Released
                         </Badge>
                       )}
                     </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${Number(milestone.amount).toFixed(2)}
                      </span>
                      {milestone.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(milestone.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {milestone.paid_at && (
                        <span className="text-green-600 font-medium">
                          Paid on {new Date(milestone.paid_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                   <div className="flex flex-col gap-2">
                     {milestone.status !== 'paid' && (
                       <>
                         {/* Pending - Creator starts work */}
                         {userRole === 'creator' && milestone.status === 'pending' && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleStatusChange(milestone.id, 'in_progress')}
                           >
                             Start Work
                           </Button>
                         )}

                         {/* Pending - Client can secure with escrow */}
                         {userRole === 'client' && milestone.status === 'pending' && milestone.escrow_status === 'none' && (
                           <Button
                             size="sm"
                             onClick={() => handleStripePayment(milestone, true)}
                             className="gap-2"
                           >
                             🔒 Secure with Escrow
                           </Button>
                         )}

                         {/* In Progress - Creator submits for review */}
                         {userRole === 'creator' && milestone.status === 'in_progress' && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleStatusChange(milestone.id, 'review')}
                           >
                             Submit for Review
                           </Button>
                         )}

                         {/* Review - Client can approve or request changes */}
                         {userRole === 'client' && milestone.status === 'review' && (
                           <>
                             {milestone.escrow_status === 'authorized' ? (
                               <>
                                 <Button
                                   size="sm"
                                   onClick={() => handleCapturePayment(milestone)}
                                   className="gap-2"
                                 >
                                   ✓ Approve & Release ${Number(milestone.amount).toFixed(2)}
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleCancelPayment(milestone)}
                                 >
                                   ✕ Reject & Refund
                                 </Button>
                               </>
                             ) : (
                               <>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleStatusChange(milestone.id, 'in_progress')}
                                 >
                                   Request Changes
                                 </Button>
                                 <Button
                                   size="sm"
                                   onClick={() => handleStatusChange(milestone.id, 'completed')}
                                 >
                                   Approve
                                 </Button>
                               </>
                             )}
                           </>
                         )}

                         {/* Completed - Client can pay */}
                         {userRole === 'client' && milestone.status === 'completed' && milestone.escrow_status === 'none' && (
                           <>
                             <Button
                               size="sm"
                               onClick={() => handleStripePayment(milestone, false)}
                               className="gap-2"
                             >
                               <CreditCard className="h-4 w-4" />
                               Pay Now ${Number(milestone.amount).toFixed(2)}
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleStripePayment(milestone, true)}
                               className="gap-2"
                             >
                               🔒 Pay with Escrow
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleMarkAsPaid(milestone.id)}
                               className="gap-2 text-xs"
                             >
                               <DollarSign className="h-4 w-4" />
                               Mark Paid (offline)
                             </Button>
                           </>
                         )}
                       </>
                     )}
                   </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}