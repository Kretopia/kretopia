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
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [endorserName, setEndorserName] = useState("");
  const [endorserEmail, setEndorserEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const { toast } = useToast();

  const handleRequestEndorsement = async () => {
    if (!selectedSkill || !endorserEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("skill_endorsement_requests")
        .insert({
          profile_id: userId,
          skill_name: selectedSkill,
          endorser_name: endorserName,
          endorser_email: endorserEmail,
          project_name: projectName,
          personal_message: personalMessage,
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/endorse-skill/${data.share_token}`;
      setShareLink(link);
      setShareDialogOpen(false);

      toast({
        title: "Endorsement Link Created!",
        description: "Copy and share the link with your client",
      });

      // Reset form
      setEndorserName("");
      setEndorserEmail("");
      setProjectName("");
      setPersonalMessage("");
      setSelectedSkill("");

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
        <div className="grid gap-3">
          {skills.map((skill) => {
            const stats = getSkillStats(skill);
            return (
              <div
                key={skill.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{skill.name}</span>
                    {stats.endorsements > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{stats.endorsements} endorsement{stats.endorsements !== 1 ? 's' : ''}</span>
                    {stats.level !== 'No endorsements yet' && getLevelBadge(stats.level)}
                  </div>
                </div>
                <Dialog open={shareDialogOpen && selectedSkill === skill.name} onOpenChange={(open) => {
                  setShareDialogOpen(open);
                  if (open) setSelectedSkill(skill.name);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Request Endorsement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Endorsement for {skill.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="endorserEmail">Client Email *</Label>
                        <Input
                          id="endorserEmail"
                          type="email"
                          value={endorserEmail}
                          onChange={(e) => setEndorserEmail(e.target.value)}
                          placeholder="client@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endorserName">Client Name</Label>
                        <Input
                          id="endorserName"
                          value={endorserName}
                          onChange={(e) => setEndorserName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="projectName">Project Name</Label>
                        <Input
                          id="projectName"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Website Redesign"
                        />
                      </div>
                      <div>
                        <Label htmlFor="personalMessage">Personal Message</Label>
                        <Textarea
                          id="personalMessage"
                          value={personalMessage}
                          onChange={(e) => setPersonalMessage(e.target.value)}
                          placeholder="Add a personal note to your client..."
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handleRequestEndorsement}
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? "Creating..." : "Create Endorsement Link"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>

        {shareLink && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <Label>Share this link with your client:</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly />
              <Button onClick={copyToClipboard} variant="outline">
                Copy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
