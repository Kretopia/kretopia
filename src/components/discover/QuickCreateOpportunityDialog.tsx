import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface QuickCreateOpportunityDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const QuickCreateOpportunityDialog = ({ open: controlledOpen, onOpenChange }: QuickCreateOpportunityDialogProps = {}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'collaboration',
    description: '',
    location: 'remote',
    compensation: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing information",
        description: "Please fill in title and description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to create opportunities",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          title: formData.title,
          type: formData.type,
          description: formData.description,
          location: formData.location,
          compensation: formData.compensation || 'Negotiable',
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Award XP for creating opportunity (50 XP)
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp: (profile.xp || 0) + 50 })
          .eq('user_id', user.id);
        
        await supabase
          .from('xp_activities')
          .insert({
            user_id: user.id,
            activity_type: 'opportunity_posted',
            xp_earned: 50,
            description: `Posted ${formData.title}`
          });
      }

      toast({
        title: "Opportunity Created!",
        description: `${formData.title} is now live. +50 XP earned!`,
      });

      setOpen(false);
      setFormData({
        title: '',
        type: 'collaboration',
        description: '',
        location: 'remote',
        compensation: ''
      });

      // Navigate to the opportunity detail page
      if (data) {
        navigate(`/opportunity/${data.id}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create opportunity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Opportunity</DialogTitle>
          <DialogDescription>
            Post a new collaboration or job opportunity
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Need photographer for event"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collaboration">Collaboration</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="gig">Gig</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what you're looking for..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compensation">Compensation</Label>
            <Input
              id="compensation"
              placeholder="e.g., $500, Equity, TBD"
              value={formData.compensation}
              onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
