import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Share2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  name: string;
  endorsements?: number;
  averageLevel?: string;
}

interface SkillsVerificationProps {
  skills: Skill[];
  userId: string;
  onSkillsUpdate?: () => void;
}

export const SkillsVerification = ({ skills, userId, onSkillsUpdate }: SkillsVerificationProps) => {
  const [personalMessage, setPersonalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("skill_endorsement_requests")
        .insert({
          profile_id: userId,
          skill_name: "All Skills", // Generic request for all skills
          personal_message: personalMessage || null,
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/endorse-skill/${data.share_token}`;
      setShareLink(link);

      toast({
        title: "Link Generated!",
        description: "Share this link to receive endorsements",
      });

      onSkillsUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const getSkillStats = (skill: Skill) => ({
    endorsements: skill.endorsements || 0,
    level: skill.averageLevel || 'No endorsements yet',
  });

  const getLevelBadge = (level: string) => {
    const levels: Record<string, { variant: any; icon: any }> = {
      expert: { variant: "default", icon: <Star className="h-3 w-3" /> },
      advanced: { variant: "secondary", icon: <Star className="h-3 w-3" /> },
      intermediate: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      beginner: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
    };

    const config = levels[level.toLowerCase()] || levels.beginner;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {level}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Endorsements</CardTitle>
        <CardDescription>
          Request endorsements from clients to validate your skills and proficiency levels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skills Display */}
        <div className="grid gap-2 sm:gap-3">
          {skills.map((skill) => {
            const stats = getSkillStats(skill);
            return (
              <div
                key={skill.name}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm sm:text-base">{skill.name}</span>
                    {stats.endorsements > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <span>{stats.endorsements} endorsement{stats.endorsements !== 1 ? 's' : ''}</span>
                    {stats.level !== 'No endorsements yet' && getLevelBadge(stats.level)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generate Link Section */}
        <div className="pt-4 border-t space-y-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" variant="default">
                <Share2 className="h-4 w-4 mr-2" />
                Request Endorsements
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Endorsement Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
                  <Textarea
                    id="personalMessage"
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Add a note for your clients..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={handleGenerateLink}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Generating..." : "Generate Link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {shareLink && (
            <div className="p-3 sm:p-4 bg-muted rounded-lg space-y-2">
              <Label className="text-sm">Share this link:</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  value={shareLink} 
                  readOnly 
                  className="text-xs sm:text-sm flex-1"
                />
                <Button 
                  onClick={copyToClipboard} 
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
