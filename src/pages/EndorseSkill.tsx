import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Star } from "lucide-react";

export default function EndorseSkill() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

  const [formData, setFormData] = useState({
    endorserName: "",
    endorserEmail: "",
    endorserCompany: "",
    testimonial: "",
    relationship: "",
  });
  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");

  useEffect(() => {
    if (!token) {
      toast({ title: "Error", description: "Invalid endorsement link", variant: "destructive" });
      navigate("/");
      return;
    }
    fetchRequestData();
  }, [token]);

  const fetchRequestData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_endorsement_request_by_token", {
        token_param: token,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Invalid or Expired Link",
          description: "This endorsement request is no longer valid",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const request = data[0];
      setRequestData(request);

      // Fetch profile data with skills
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, skills")
        .eq("user_id", request.profile_id)
        .single();

      setProfileData(profile);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.endorserName || !formData.endorserEmail || !selectedSkill || !proficiencyLevel) {
      toast({
        title: "Missing Information",
        description: "Please select a skill, proficiency level, and provide your details",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create endorsement
      const { error: endorsementError } = await supabase
        .from("skill_endorsements")
        .insert({
          profile_id: requestData.profile_id,
          request_id: requestData.id,
          skill_name: selectedSkill,
          endorser_name: formData.endorserName,
          endorser_email: formData.endorserEmail,
          endorser_company: formData.endorserCompany,
          proficiency_level: proficiencyLevel,
          testimonial: formData.testimonial,
          relationship: formData.relationship,
        });

      if (endorsementError) throw endorsementError;

      setSubmitted(true);
      toast({
        title: "Thank You!",
        description: "Your endorsement has been submitted successfully",
      });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Thank You!</h2>
            <p className="text-muted-foreground">
              Your endorsement has been submitted successfully. {profileData?.full_name} will
              appreciate your feedback.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Endorse {profileData?.full_name}'s Skills</CardTitle>
          <CardDescription>
            Select a skill to endorse and share your experience
          </CardDescription>
          {requestData?.personal_message && (
            <div className="mt-4 p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-sm italic">{requestData.personal_message}</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Skill Selection */}
            <div>
              <Label htmlFor="skillSelect" className="text-sm sm:text-base">Select Skill to Endorse *</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger id="skillSelect">
                  <SelectValue placeholder="Choose a skill" />
                </SelectTrigger>
                <SelectContent>
                  {profileData?.skills?.map((skill: string) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proficiency Level */}
            <div>
              <Label htmlFor="proficiencyLevel" className="text-sm sm:text-base">Proficiency Level *</Label>
              <Select value={proficiencyLevel} onValueChange={setProficiencyLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select proficiency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Beginner
                    </div>
                  </SelectItem>
                  <SelectItem value="intermediate">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4" />
                      Intermediate
                    </div>
                  </SelectItem>
                  <SelectItem value="advanced">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4" />
                      Advanced
                    </div>
                  </SelectItem>
                  <SelectItem value="expert">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      Expert
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Your Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="endorserName" className="text-sm sm:text-base">Your Name *</Label>
                <Input
                  id="endorserName"
                  value={formData.endorserName}
                  onChange={(e) => setFormData({ ...formData, endorserName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endorserEmail" className="text-sm sm:text-base">Your Email *</Label>
                <Input
                  id="endorserEmail"
                  type="email"
                  value={formData.endorserEmail}
                  onChange={(e) => setFormData({ ...formData, endorserEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="endorserCompany" className="text-sm sm:text-base">Your Company</Label>
                <Input
                  id="endorserCompany"
                  value={formData.endorserCompany}
                  onChange={(e) => setFormData({ ...formData, endorserCompany: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="relationship" className="text-sm sm:text-base">Your Relationship</Label>
                <Input
                  id="relationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="e.g., Client, Manager"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="testimonial" className="text-sm sm:text-base">Testimonial (Optional)</Label>
              <Textarea
                id="testimonial"
                value={formData.testimonial}
                onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
                placeholder="Share your experience..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Endorsement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
