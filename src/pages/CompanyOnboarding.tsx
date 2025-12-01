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
  { title: "Company Setup", icon: Building2 },
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
      .select("onboarding_completed, account_type, role")
      .eq("user_id", user.id)
      .single();

    // If user reached this page but account_type is not company, fix it
    if (profile?.account_type !== "company") {
      await supabase
        .from("profiles")
        .update({ 
          account_type: "company",
          role: "Company"
        })
        .eq("user_id", user.id);
      
      toast.success("Account type updated to Company");
    } else if (profile?.role !== "Company") {
      // Also fix role if account_type is correct but role isn't
      await supabase
        .from("profiles")
        .update({ role: "Company" })
        .eq("user_id", user.id);
    }

    if (profile?.onboarding_completed) {
      navigate("/circle");
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
    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    if (!address.trim()) {
      toast.error("Please enter your company address");
      return;
    }
    
    completeOnboarding();
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
      navigate("/circle");
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
          <CardTitle>Set Up Your Company Profile</CardTitle>
          <CardDescription>
            Complete your profile in under 2 minutes to start hiring talent
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <Avatar className="w-20 h-20">
                <AvatarImage src={logoUrl} alt={companyName} />
                <AvatarFallback>
                  <Building2 className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="logo" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>{logoUrl ? "Change Logo" : "Upload Logo (Optional)"}</span>
                  </Button>
                </Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            <div className="space-y-4">
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
                <Label htmlFor="address">Company Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, Country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAbout">About Your Company</Label>
                <Textarea
                  id="companyAbout"
                  value={companyAbout}
                  onChange={(e) => setCompanyAbout(e.target.value)}
                  placeholder="What does your company do? What makes you unique?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size (Optional)</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
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
                  <Label htmlFor="industry">Industry (Optional)</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
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
              </div>
            </div>
          </div>

          <Button
            onClick={handleNext}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Setting up..." : "Complete Setup"}
          </Button>
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
