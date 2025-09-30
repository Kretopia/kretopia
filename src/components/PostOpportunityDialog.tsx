import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Loader2 } from "lucide-react";

interface PostOpportunityDialogProps {
  variant?: "default" | "outline" | "hero";
  size?: "default" | "xl";
  className?: string;
}

export const PostOpportunityDialog = ({ variant = "default", size = "default", className }: PostOpportunityDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    company: "",
    title: "",
    type: "job",
    description: "",
    compensation: "",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call AI moderation function
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('moderate-opportunity', {
        body: {
          title: formData.title,
          description: formData.description,
          compensation: formData.compensation,
        }
      });

      if (moderationError) throw moderationError;

      if (moderationData?.flagged) {
        toast({
          title: "Content Flagged",
          description: moderationData.reason || "Your post contains content that violates our guidelines.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create opportunity without auth
      const { error: opportunityError } = await supabase
        .from('opportunities')
        .insert({
          title: formData.title,
          type: formData.type,
          description: formData.description,
          compensation: formData.compensation,
          location: formData.location,
          tags: [formData.company],
          status: 'active',
        });

      if (opportunityError) throw opportunityError;

      toast({
        title: "Opportunity Posted! 🎉",
        description: "Your opportunity is now live on ThriveIN Discover.",
      });

      setFormData({
        email: "",
        company: "",
        title: "",
        type: "job",
        description: "",
        compensation: "",
        location: "",
      });
      setOpen(false);
    } catch (error) {
      console.error('Error posting opportunity:', error);
      toast({
        title: "Failed to Post",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Briefcase className="mr-2 h-5 w-5" />
          Post an Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Post a Job or Collaboration</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Your Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company/Brand Name *</Label>
            <Input
              id="company"
              placeholder="Your Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Opportunity Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job">Paid Job</SelectItem>
                <SelectItem value="collab">Collaboration</SelectItem>
                <SelectItem value="barter">Barter/Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Looking for Videographer for Event"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the opportunity, requirements, and what you're looking for..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={5}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="compensation">Budget/Compensation</Label>
            <Input
              id="compensation"
              placeholder="e.g., $500, Revenue share, Trade services"
              value={formData.compensation}
              onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Los Angeles, CA or Remote"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Opportunity"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
