import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, MapPin, Users, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";

const STEPS = [
  { title: "Company Info", icon: Building2 },
  { title: "Location", icon: MapPin },
  { title: "Details", icon: Users },
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const INDUSTRIES = [
  "Advertising & Marketing",
  "Architecture & Design",
  "Film & Video Production",
  "Gaming",
  "Music & Audio",
  "Photography",
  "Software & Technology",
  "Entertainment & Events",
  "Fashion & Retail",
  "Food & Beverage",
  "Hospitality",
  "Other",
];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyAbout, setCompanyAbout] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [address, setAddress] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    // Check if already completed onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, account_type")
      .eq("user_id", user.id)
      .single();

    // If user reached this page but account_type is not company, fix it
    if (profile?.account_type !== "company") {
      await supabase
        .from("profiles")
        .update({ account_type: "company" })
        .eq("user_id", user.id);
      
      toast.success("Account type updated to Company");
    }

    if (profile?.onboarding_completed) {
      navigate("/dashboard");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreviewUrl(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (croppedBlob: Blob) => {
    if (!userId) return;

    setUploadingLogo(true);
    try {
      const fileName = `${userId}/logo-${Date.now()}.jpg`;
      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      setShowCropDialog(false);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    if (currentStep === 1 && !address.trim()) {
      toast.error("Please enter your company address");
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: companyName,
          company_logo_url: logoUrl,
          company_about: companyAbout,
          company_address: address,
          company_size: companySize,
          company_industry: industry,
          onboarding_completed: true,
          full_name: companyName, // Use company name as display name
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Welcome to ThriveIN! 🎉");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <SEO title="Company Onboarding - ThriveIN" description="Set up your company profile" />
      
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Set Up Your Company Profile</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <Progress value={((currentStep + 1) / STEPS.length) * 100} />
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={logoUrl} alt={companyName} />
                  <AvatarFallback>
                    <Building2 className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Upload Company Logo</span>
                    </Button>
                  </Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, max 5MB
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAbout">About Your Company</Label>
                <Textarea
                  id="companyAbout"
                  value={companyAbout}
                  onChange={(e) => setCompanyAbout(e.target.value)}
                  placeholder="Tell us about your company, what you do, and what makes you unique..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Company Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, Country"
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown on your company profile and used for location-based features
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Ready to launch!
                </h4>
                <p className="text-sm text-muted-foreground">
                  Once you complete setup, you can start posting opportunities, 
                  finding talent, and building your company's reputation on ThriveIN.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : currentStep === STEPS.length - 1 ? "Complete Setup" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {logoPreviewUrl && (
        <ImageCropDialog
          open={showCropDialog}
          onClose={() => setShowCropDialog(false)}
          imageUrl={logoPreviewUrl}
          onCropComplete={uploadLogo}
          loading={uploadingLogo}
        />
      )}
    </div>
  );
}
