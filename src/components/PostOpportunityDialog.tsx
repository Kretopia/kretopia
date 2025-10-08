import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Loader2, Upload, X } from "lucide-react";

interface PostOpportunityDialogProps {
  variant?: "default" | "outline" | "hero";
  size?: "default" | "xl";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const PostOpportunityDialog = ({ 
  variant = "default", 
  size = "default", 
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess
}: PostOpportunityDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
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
    requirements: "",
    skills: "",
    deliverables: "",
    duration: "",
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PostOpportunity] Form submitted');
    setLoading(true);

    try {
      console.log('[PostOpportunity] Getting user...');
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[PostOpportunity] User:', user?.id);
      if (!user) {
        console.error('[PostOpportunity] No user found');
        throw new Error("You must be logged in to post opportunities");
      }
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

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        console.log('[PostOpportunity] Uploading to:', filePath, 'User ID:', user.id);

        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('[PostOpportunity] Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create opportunity with authenticated user
      const { error: opportunityError } = await supabase
        .from('opportunities')
        .insert({
          title: formData.title,
          type: formData.type,
          description: formData.description,
          compensation: formData.compensation,
          location: formData.location,
          requirements: formData.requirements,
          skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
          deliverables: formData.deliverables,
          duration: formData.duration,
          tags: [formData.company],
          status: 'active',
          image_url: imageUrl,
          created_by: user.id,
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
        requirements: "",
        skills: "",
        deliverables: "",
        duration: "",
      });
      setImageFile(null);
      setImagePreview("");
      setOpen(false);
      
      // Call success callback to refresh the list
      if (onSuccess) {
        onSuccess();
      }
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
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Post a Job or Collaboration</DialogTitle>
          <DialogDescription>Share your opportunity with the ThriveIN community</DialogDescription>
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

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="e.g., 5k+ Instagram followers, 2+ years experience, portfolio required"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills Needed (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="e.g., Video Editing, Social Media Marketing, Photography"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliverables">Deliverables</Label>
            <Textarea
              id="deliverables"
              placeholder="e.g., 3 Instagram posts, 1 YouTube video, weekly content calendar"
              value={formData.deliverables}
              onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration/Timeline</Label>
            <Input
              id="duration"
              placeholder="e.g., 1 month, 3-6 months, Ongoing"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Opportunity Image</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {imageFile ? "Change Image" : "Upload Image"}
                </Button>
                {imageFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
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
