import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Upload, Palette } from "lucide-react";

export interface InvoiceBranding {
  brand_name: string;
  brand_logo_url: string;
  brand_address: string;
  brand_email: string;
  brand_website: string;
  brand_color: string;
}

interface InvoiceBrandingFormProps {
  branding: InvoiceBranding;
  onChange: (branding: InvoiceBranding) => void;
}

const DEFAULT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", 
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#1e293b", "#dc2626", "#059669"
];

export function InvoiceBrandingForm({ branding, onChange }: InvoiceBrandingFormProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Auto-fill from profile on mount
  useEffect(() => {
    if (user?.id && !branding.brand_name) {
      loadProfileBranding();
    }
  }, [user?.id]);

  const loadProfileBranding = async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name, company_logo_url, company_address, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const { data: authData } = await supabase.auth.getUser();
      onChange({
        ...branding,
        brand_name: profile.company_name || profile.full_name || "",
        brand_logo_url: profile.company_logo_url || profile.avatar_url || "",
        brand_address: profile.company_address || "",
        brand_email: authData?.user?.email || "",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/invoice-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      onChange({ ...branding, brand_logo_url: publicUrl });
    } catch (err) {
      console.error("Logo upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Your Branding</h3>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/50">
          {branding.brand_logo_url ? (
            <img src={branding.brand_logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <Label htmlFor="logo-upload" className="text-xs text-muted-foreground">Business Logo</Label>
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploading}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Business Details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Business Name *</Label>
          <Input
            value={branding.brand_name}
            onChange={(e) => onChange({ ...branding, brand_name: e.target.value })}
            placeholder="Your Studio / Name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            value={branding.brand_email}
            onChange={(e) => onChange({ ...branding, brand_email: e.target.value })}
            placeholder="billing@yourstudio.com"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Address</Label>
          <Input
            value={branding.brand_address}
            onChange={(e) => onChange({ ...branding, brand_address: e.target.value })}
            placeholder="123 Creative St, City"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Website</Label>
          <Input
            value={branding.brand_website}
            onChange={(e) => onChange({ ...branding, brand_website: e.target.value })}
            placeholder="https://yourstudio.com"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Brand Color */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Palette className="h-3 w-3" /> Accent Color
        </Label>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...branding, brand_color: color })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                branding.brand_color === color ? "border-foreground scale-125" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <Input
            type="color"
            value={branding.brand_color}
            onChange={(e) => onChange({ ...branding, brand_color: e.target.value })}
            className="h-6 w-6 p-0 border-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
