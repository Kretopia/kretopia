import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface EasyApplyButtonProps {
  opportunityId: string;
  opportunityTitle: string;
  className?: string;
  size?: "sm" | "default";
}

export const EasyApplyButton = ({ opportunityId, opportunityTitle, className, size = "sm" }: EasyApplyButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleEasyApply = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("applicant_id", user.id)
        .eq("opportunity_id", opportunityId)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already applied", description: "You've already applied to this opportunity" });
        setApplied(true);
        return;
      }

      // Get user profile for auto-fill
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      const coverLetter = profile
        ? `Hi! I'm ${profile.full_name}, a ${profile.role || "creative professional"}. I'm interested in "${opportunityTitle}" and would love to discuss how I can contribute. ${profile.bio ? profile.bio.slice(0, 200) : ""}`
        : `I'm interested in this opportunity and would love to discuss further.`;

      const { error } = await supabase.from("applications").insert({
        applicant_id: user.id,
        opportunity_id: opportunityId,
        cover_letter: coverLetter,
        status: "pending",
      });

      if (error) throw error;

      setApplied(true);
      toast({
        title: "Applied! ⚡",
        description: "Your quick application has been sent",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (applied) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
        Applied
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size={size}
      className={className}
      onClick={handleEasyApply}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Zap className="h-3.5 w-3.5 mr-1" />
      )}
      Easy Apply
    </Button>
  );
};
