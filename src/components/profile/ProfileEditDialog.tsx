import { useState, useEffect, useMemo, memo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { checkProfileCompletion, ProfileCompletionStatus } from "@/lib/profileCompletion";
import { Database } from "@/integrations/supabase/types";
import { CollabIntentSelector } from "./CollabIntentSelector";

// Standardized options - must match filter options in BrowseCreators.tsx
export const ROLE_OPTIONS = [
  { value: 'Photographer', label: 'Photographer' },
  { value: 'Videographer', label: 'Videographer' },
  { value: 'Musician', label: 'Musician / Producer' },
  { value: 'Content Creator', label: 'Content Creator' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Writer', label: 'Writer / Copywriter' },
  { value: 'Developer', label: 'Developer' },
  { value: 'Marketing', label: 'Marketing / Brand' },
  { value: 'Model', label: 'Model / Talent' },
  { value: 'Filmmaker', label: 'Filmmaker / Director' },
  { value: 'Animator', label: 'Animator / Motion' },
  { value: 'Podcaster', label: 'Podcaster' },
  { value: 'Influencer', label: 'Influencer' },
  { value: 'Other', label: 'Other' },
];

export const LOCATION_OPTIONS = [
  { value: 'Bali, Indonesia', label: 'Bali, Indonesia' },
  { value: 'Jakarta, Indonesia', label: 'Jakarta, Indonesia' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Vietnam', label: 'Vietnam' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Europe', label: 'Europe' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Remote', label: 'Remote / Worldwide' },
  { value: 'Other', label: 'Other' },
];

type Profile = Database['public']['Tables']['profiles']['Row'];

// FieldWrapper moved OUTSIDE the component to prevent re-creation on each render
const FieldWrapper = memo(({ 
  label, 
  children, 
  isIncomplete,
  hint 
}: { 
  label: string; 
  children: React.ReactNode; 
  isIncomplete: boolean;
  hint?: string;
}) => {
  return (
    <div className={`space-y-2 relative ${isIncomplete ? 'ring-2 ring-primary/20 rounded-lg p-3 bg-primary/5' : ''}`}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isIncomplete && (
            <Badge variant="secondary" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
          {!isIncomplete && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </Label>
      </div>
      {children}
      {isIncomplete && hint && (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
});

FieldWrapper.displayName = 'FieldWrapper';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  portfolioCount: number;
  editForm: {
    full_name: string;
    role: string;
    bio: string;
    location: string;
    avatar_url: string;
    company_size: string;
    collab_intent: string;
  };
  onFormChange: (updater: any | ((prev: any) => any)) => void;
  onSave: () => void;
  onQuickFill: () => void;
}

// Inner form component that manages its own state
const ProfileEditForm = memo(({
  profile,
  portfolioCount,
  initialData,
  avatarUrl,
  onSave,
  onQuickFill,
}: {
  profile: Profile;
  portfolioCount: number;
  initialData: {
    full_name: string;
    role: string;
    bio: string;
    location: string;
    collab_intent: string;
  };
  avatarUrl: string;
  onSave: (data: typeof initialData) => void;
  onQuickFill: () => void;
}) => {
  const [fullName, setFullName] = useState(initialData.full_name);
  const [role, setRole] = useState(initialData.role);
  const [bio, setBio] = useState(initialData.bio);
  const [location, setLocation] = useState(initialData.location);
  const [collabIntent, setCollabIntent] = useState(initialData.collab_intent || 'seeking_collaborators');
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);

  // Initialize custom input visibility
  useEffect(() => {
    setShowCustomRole(!ROLE_OPTIONS.some(opt => opt.value === initialData.role) && !!initialData.role);
    setShowCustomLocation(!LOCATION_OPTIONS.some(opt => opt.value === initialData.location) && !!initialData.location);
  }, []);

  // Calculate completion
  const completion = useMemo((): ProfileCompletionStatus => {
    const tempProfile = {
      ...profile,
      full_name: fullName,
      role: role,
      bio: bio,
      location: location,
      avatar_url: avatarUrl,
    };
    return checkProfileCompletion(tempProfile, portfolioCount);
  }, [profile, fullName, role, bio, location, avatarUrl, portfolioCount]);

  const isFieldComplete = (fieldLabel: string) => completion.completedFields.includes(fieldLabel);
  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === role);
  const isLocationInOptions = LOCATION_OPTIONS.some(opt => opt.value === location);

  const handleSave = () => {
    onSave({
      full_name: fullName,
      role,
      bio,
      location,
      collab_intent: collabIntent,
    });
  };

  return (
    <>
      {/* Completion Progress Bar */}
      <div className="space-y-3 pb-4 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Profile Completion</span>
          <span className="text-2xl font-bold text-primary">{completion.percentage}%</span>
        </div>
        <Progress value={completion.percentage} className="h-3" />
        <p className="text-xs text-muted-foreground">
          {completion.missingFields.length === 0 ? (
            <span className="text-primary font-medium">🎉 Your profile is complete!</span>
          ) : (
            <>Complete {completion.missingFields.length} more {completion.missingFields.length === 1 ? 'field' : 'fields'} to reach 100%</>
          )}
        </p>
      </div>

      {/* Quick Fill Button */}
      <div className="border-b pb-4">
        <Button type="button" variant="outline" className="w-full gap-2" onClick={onQuickFill}>
          <Globe className="h-4 w-4" />
          Quick Fill from Website
        </Button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 py-4">
        <FieldWrapper 
          label="Full Name" 
          isIncomplete={!isFieldComplete("Full Name")}
          hint="Add your full name to help others recognize you"
        >
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            autoComplete="off"
          />
        </FieldWrapper>

        <FieldWrapper 
          label="Role/Title" 
          isIncomplete={!isFieldComplete("Role/Title")}
          hint="Your role helps others understand what you do"
        >
          {showCustomRole || (!isRoleInOptions && role) ? (
            <div className="space-y-2">
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter your role"
                autoComplete="off"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowCustomRole(false);
                  setRole('');
                }}
              >
                Choose from list instead
              </Button>
            </div>
          ) : (
            <Select 
              value={role || undefined}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setShowCustomRole(true);
                  setRole('');
                } else {
                  setRole(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FieldWrapper>

        <FieldWrapper 
          label="Location" 
          isIncomplete={!isFieldComplete("Location")}
          hint="Location helps with local collaboration opportunities"
        >
          {showCustomLocation || (!isLocationInOptions && location) ? (
            <div className="space-y-2">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your location"
                autoComplete="off"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowCustomLocation(false);
                  setLocation('');
                }}
              >
                Choose from list instead
              </Button>
            </div>
          ) : (
            <Select 
              value={location || undefined}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setShowCustomLocation(true);
                  setLocation('');
                } else {
                  setLocation(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FieldWrapper>

        <FieldWrapper 
          label="Bio" 
          isIncomplete={!isFieldComplete("Bio (20+ chars)")}
        >
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell others about yourself, your experience, and what you're looking for... (minimum 20 characters)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {bio?.length || 0}/20 characters minimum
            {!isFieldComplete("Bio (20+ chars)") && " - A detailed bio increases profile views by 60%"}
          </p>
        </FieldWrapper>

        {/* Collab Intent Selector */}
        <div className="border-t pt-4">
          <CollabIntentSelector 
            value={collabIntent}
            onChange={setCollabIntent}
          />
        </div>

        {/* Missing Fields Reminder */}
        {completion.missingFields.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Still Missing
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {completion.missingFields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {field}
                  {field === "Profile Picture" && " - Upload via camera icon on your avatar"}
                  {field === "Skills (3+)" && " - Add at least 3 skills in the Skills section below"}
                  {field === "Portfolio Items" && " - Add your work in the Portfolio section"}
                  {field === "Website or Social Link" && " - Add links in the Social Links section"}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={handleSave} className="w-full" size="lg">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Save Changes {completion.percentage === 100 ? '🎉' : ''}
        </Button>
      </div>
    </>
  );
});

ProfileEditForm.displayName = 'ProfileEditForm';

export const ProfileEditDialog = ({
  open,
  onOpenChange,
  profile,
  portfolioCount,
  editForm,
  onFormChange,
  onSave,
  onQuickFill,
}: ProfileEditDialogProps) => {
  const handleSave = (data: {
    full_name: string;
    role: string;
    bio: string;
    location: string;
    collab_intent: string;
  }) => {
    const updated = {
      ...editForm,
      ...data,
    };
    onFormChange(updated);
    // Pass data directly to onSave to avoid stale state issues
    (onSave as any)(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Fill in the missing fields to boost your visibility and unlock features
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ProfileEditForm
            key={`form-${open}`}
            profile={profile}
            portfolioCount={portfolioCount}
            initialData={{
              full_name: editForm.full_name,
              role: editForm.role,
              bio: editForm.bio,
              location: editForm.location,
              collab_intent: editForm.collab_intent,
            }}
            avatarUrl={editForm.avatar_url}
            onSave={handleSave}
            onQuickFill={onQuickFill}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};