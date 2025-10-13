import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, CheckCircle2, Clock, AlertCircle, 
  Upload, Link as LinkIcon, ExternalLink 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Skill {
  name: string;
  verified?: boolean;
  verificationUrl?: string;
}

interface SkillsVerificationProps {
  skills: Skill[];
  userId: string;
  onSkillsUpdate: (skills: Skill[]) => void;
}

export const SkillsVerification = ({ skills, userId, onSkillsUpdate }: SkillsVerificationProps) => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const verifiedCount = skills.filter(s => s.verified).length;
  const pendingCount = skills.filter(s => s.verificationUrl && !s.verified).length;
  const unverifiedCount = skills.filter(s => !s.verificationUrl && !s.verified).length;

  const handleSubmitVerification = async () => {
    if (!selectedSkill || !verificationUrl) {
      toast({
        title: "Missing information",
        description: "Please provide a verification URL",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Update skill with verification URL
      const updatedSkills = skills.map(skill => 
        skill.name === selectedSkill
          ? { ...skill, verificationUrl, verified: false }
          : skill
      );

      const { error } = await supabase
        .from('profiles')
        .update({
          professional_skills: updatedSkills as any
        })
        .eq('user_id', userId);

      if (error) throw error;

      onSkillsUpdate(updatedSkills);
      
      toast({
        title: "Verification submitted! 🎯",
        description: "We'll review your submission within 24-48 hours",
      });

      setDialogOpen(false);
      setVerificationUrl("");
      setVerificationNotes("");
      setSelectedSkill(null);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSkillStatus = (skill: Skill) => {
    if (skill.verified) return 'verified';
    if (skill.verificationUrl) return 'pending';
    return 'unverified';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Verified
          </Badge>
        );
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Skills Verification
            </CardTitle>
            <CardDescription className="mt-2">
              Verify your skills to build trust and stand out
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{verifiedCount}</div>
            <div className="text-xs text-muted-foreground">verified</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3 bg-green-500/5 border-green-500/20">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{verifiedCount}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </Card>
          <Card className="p-3 bg-yellow-500/5 border-yellow-500/20">
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </Card>
          <Card className="p-3 bg-muted/50">
            <div className="text-center">
              <div className="text-xl font-bold">{unverifiedCount}</div>
              <div className="text-xs text-muted-foreground">Unverified</div>
            </div>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1 text-sm">Why verify your skills?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Verified profiles get 5x more trust from potential collaborators</li>
                <li>• Rank higher in search results and recommendations</li>
                <li>• Access to exclusive opportunities requiring verified skills</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Skills List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Your Skills</h4>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No skills added yet. Add skills to start verification.
            </p>
          ) : (
            <div className="space-y-2">
              {skills.map((skill, index) => {
                const status = getSkillStatus(skill);
                return (
                  <Card key={index} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{skill.name}</div>
                        {skill.verificationUrl && (
                          <a 
                            href={skill.verificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View proof
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        {status === 'unverified' && (
                          <Dialog open={dialogOpen && selectedSkill === skill.name} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedSkill(skill.name)}
                              >
                                Verify
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Verify Skill: {skill.name}</DialogTitle>
                                <DialogDescription>
                                  Provide proof of your skill (certificates, portfolio work, etc.)
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <Label htmlFor="verification-url">Verification URL *</Label>
                                  <Input
                                    id="verification-url"
                                    placeholder="https://certificate.com/your-cert"
                                    value={verificationUrl}
                                    onChange={(e) => setVerificationUrl(e.target.value)}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Link to certificate, portfolio item, or other proof
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="verification-notes">Additional Notes</Label>
                                  <Textarea
                                    id="verification-notes"
                                    placeholder="Any context that helps verify this skill..."
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>
                                <Button 
                                  onClick={handleSubmitVerification}
                                  disabled={submitting}
                                  className="w-full"
                                >
                                  {submitting ? (
                                    <>
                                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Submit for Review
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
