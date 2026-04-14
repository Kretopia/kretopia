import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Building2, CheckCircle2, Loader2, Mail, X, Upload, ImageIcon, Crop } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { AIJobDescriptionGenerator } from "@/components/opportunity/AIJobDescriptionGenerator";
import { useAuth } from "@/hooks/useAuth";
import { hasProAccess } from "@/lib/subscriptionConfig";

const STORAGE_KEY = "thrivein_draft_opportunity";

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveDraft(data: Record<string, unknown>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

const PostOpportunity = () => {
  const draft = loadDraft();
  const [step, setStep] = useState<"form" | "sent" | "error">("form");
  const [posting, setPosting] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    company_name: draft?.company_name || "",
    email: draft?.email || "",
    logo_url: draft?.logo_url || "",
    title: draft?.title || "",
    description: draft?.description || "",
    type: draft?.type || "collab",
    compensation: draft?.compensation || "",
    skills: (draft?.skills as string[]) || ([] as string[]),
    requirements: draft?.requirements || "",
    deliverables: draft?.deliverables || "",
    location: draft?.location || "remote",
    location_city: draft?.location_city || "",
    location_country: draft?.location_country || "",
    image_url: draft?.image_url || "",
  });
  const { toast } = useToast();
  const { subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  // Auto-save draft on every form change
  useEffect(() => {
    saveDraft(formData);
  }, [formData]);

  // Warn before leaving page with data
  useEffect(() => {
    const hasData = formData.title.trim() || formData.description.trim() || formData.company_name.trim();
    if (!hasData) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formData.title, formData.description, formData.company_name]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageUrl(reader.result as string);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" });
    setImageFile(file);
    setFormData({ ...formData, image_url: "" });
    const url = URL.createObjectURL(croppedBlob);
    setImagePreview(url);
    setShowCropDialog(false);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim() || !formData.email.trim() || !formData.title.trim() || !formData.description.trim()) {
      toast({ title: "Missing fields", description: "Please fill in company name, email, title, and description.", variant: "destructive" });
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setPosting(true);
    try {
      // If user uploaded a file, convert to base64 for the edge function
      let imageData = null;
      if (imageFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        imageData = base64;
      }

      const { data, error } = await supabase.functions.invoke("verify-guest-opportunity", {
        body: { action: "send-verification", ...formData, image_data: imageData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      clearDraft();
      setStep("sent");
    } catch (error: any) {
      console.error("Error posting:", error);
      toast({ title: "Something went wrong", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (step === "sent") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Helmet>
          <title>Check Your Email | ThriveIN</title>
        </Helmet>
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your email! </CardTitle>
            <CardDescription className="text-base">
              We sent a verification link to <strong>{formData.email}</strong>. Click it to publish your opportunity and start receiving applications from top creatives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Didn't get it? Check your spam folder or{" "}
              <button onClick={() => setStep("form")} className="text-primary underline">
                try again
              </button>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Post an Opportunity | ThriveIN</title>
        <meta name="description" content="Post a job, collaboration, or gig opportunity on ThriveIN and connect with thousands of creative professionals. No account needed." />
      </Helmet>

      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Building2 className="h-4 w-4" />
            For Companies & Brands
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Find the perfect creative talent</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Post your opportunity and connect with vetted creators. No account needed — just verify your email.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Your Company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="e.g., Acme Studios"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@company.com"
                    maxLength={255}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (optional)</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://your-site.com/logo.png"
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Opportunity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AIJobDescriptionGenerator
                isPro={isPro}
                onGenerated={(data) => {
                  setFormData((prev) => ({
                    ...prev,
                    title: data.title || prev.title,
                    description: data.description || prev.description,
                    requirements: data.requirements || prev.requirements,
                    deliverables: data.deliverables || prev.deliverables,
                    skills: data.skills?.length ? data.skills : prev.skills,
                    compensation: data.compensation || prev.compensation,
                  }));
                }}
              />

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Looking for Video Editor for Music Video"
                  maxLength={200}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, project, and what you're looking for..."
                  rows={5}
                  maxLength={2000}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Paid Job</SelectItem>
                      <SelectItem value="collab">Collaboration</SelectItem>
                      <SelectItem value="barter">Barter/Trade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location Type</Label>
                  <Select value={formData.location} onValueChange={(val) => setFormData({ ...formData, location: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.location === "hybrid" || formData.location === "onsite") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_city">City</Label>
                    <Input
                      id="location_city"
                      value={formData.location_city}
                      onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                      placeholder="e.g., Dubai, Los Angeles"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_country">Country</Label>
                    <Input
                      id="location_country"
                      value={formData.location_country}
                      onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                      placeholder="e.g., UAE, United States"
                      maxLength={100}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="compensation">Compensation</Label>
                <Input
                  id="compensation"
                  value={formData.compensation}
                  onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                  placeholder="e.g., $500-1000, Revenue share, Credit only"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add a skill and press Enter"
                    maxLength={50}
                  />
                  <Button type="button" onClick={handleAddSkill} variant="outline">Add</Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Any specific requirements or qualifications..."
                  rows={2}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverables">Deliverables</Label>
                <Textarea
                  id="deliverables"
                  value={formData.deliverables}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  placeholder="What will the collaborator deliver..."
                  rows={2}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Image (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview || formData.image_url ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setRawImageUrl(imagePreview);
                            setShowCropDialog(true);
                          }}
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">Click to upload an image</span>
                    <span className="text-xs">PNG, JPG up to 5MB</span>
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Or paste a URL:</span>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="h-7 text-xs"
                    maxLength={500}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3">
            <Button type="submit" size="lg" className="w-full gap-2" disabled={posting}>
              {posting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="h-5 w-5" /> Post Opportunity (Free)</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We'll send a verification email. Your listing goes live once you confirm. No account needed.
            </p>
          </div>
        </form>
      </div>

      <ImageCropDialog
        imageUrl={rawImageUrl}
        open={showCropDialog}
        onClose={() => setShowCropDialog(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default PostOpportunity;
