import { useState } from "react";
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
import { CollabIntentSelector, CollabIntentValue } from "./CollabIntentSelector";

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
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);

  // Calculate completion based on current form state
  const getCurrentCompletion = (): ProfileCompletionStatus => {
    const tempProfile = {
      ...profile,
      full_name: editForm.full_name,
      role: editForm.role,
      bio: editForm.bio,
      location: editForm.location,
      avatar_url: editForm.avatar_url,
    };
    return checkProfileCompletion(tempProfile, portfolioCount);
  };

  const completion = getCurrentCompletion();

  const getFieldStatus = (fieldLabel: string) => {
    return completion.completedFields.includes(fieldLabel) ? 'complete' : 'incomplete';
  };

  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === editForm.role);
  const isLocationInOptions = LOCATION_OPTIONS.some(opt => opt.value === editForm.location);

  const FieldWrapper = ({ label, children, fieldLabel }: { label: string; children: React.ReactNode; fieldLabel: string }) => {
    const status = getFieldStatus(fieldLabel);
    const isIncomplete = status === 'incomplete';

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
      </div>
    );
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
              <>
                Complete {completion.missingFields.length} more {completion.missingFields.length === 1 ? 'field' : 'fields'} to reach 100%
              </>
            )}
          </p>
        </div>

        {/* Quick Fill Button */}
        <div className="border-b pb-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={onQuickFill}
          >
            <Globe className="h-4 w-4" />
            Quick Fill from Website
          </Button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 py-4">
          <FieldWrapper label="Full Name" fieldLabel="Full Name">
            <Input
              id="full_name"
              value={editForm.full_name}
              onChange={(e) => {
                const value = e.target.value;
                onFormChange((prev: typeof editForm) => ({ ...prev, full_name: value }));
              }}
              placeholder="Your full name"
            />
            {getFieldStatus("Full Name") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                Add your full name to help others recognize you
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Role/Title" fieldLabel="Role/Title">
            {showCustomRole || (!isRoleInOptions && editForm.role) ? (
              <div className="space-y-2">
                <Input
                  id="role"
                  value={editForm.role}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFormChange((prev: typeof editForm) => ({ ...prev, role: value }));
                  }}
                  placeholder="Enter your role"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCustomRole(false);
                    onFormChange((prev: typeof editForm) => ({ ...prev, role: '' }));
                  }}
                >
                  Choose from list instead
                </Button>
              </div>
            ) : (
              <Select 
                value={editForm.role || undefined}
                onValueChange={(value) => {
                  if (value === 'Other') {
                    setShowCustomRole(true);
                    onFormChange((prev: typeof editForm) => ({ ...prev, role: '' }));
                  } else {
                    onFormChange((prev: typeof editForm) => ({ ...prev, role: value }));
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
            {getFieldStatus("Role/Title") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                Your role helps others understand what you do
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Location" fieldLabel="Location">
            {showCustomLocation || (!isLocationInOptions && editForm.location) ? (
              <div className="space-y-2">
                <Input
                  id="location"
                  value={editForm.location}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFormChange((prev: typeof editForm) => ({ ...prev, location: value }));
                  }}
                  placeholder="Enter your location"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCustomLocation(false);
                    onFormChange((prev: typeof editForm) => ({ ...prev, location: '' }));
                  }}
                >
                  Choose from list instead
                </Button>
              </div>
            ) : (
              <Select 
                value={editForm.location || undefined}
                onValueChange={(value) => {
                  if (value === 'Other') {
                    setShowCustomLocation(true);
                    onFormChange((prev: typeof editForm) => ({ ...prev, location: '' }));
                  } else {
                    onFormChange((prev: typeof editForm) => ({ ...prev, location: value }));
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
            {getFieldStatus("Location") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                Location helps with local collaboration opportunities
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Bio" fieldLabel="Bio">
            <Textarea
              id="bio"
              value={editForm.bio}
              onChange={(e) => {
                const value = e.target.value;
                onFormChange((prev: typeof editForm) => ({ ...prev, bio: value }));
              }}
              rows={4}
              placeholder="Tell others about yourself, your experience, and what you're looking for... (minimum 20 characters)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {editForm.bio.length}/20 characters minimum
              {getFieldStatus("Bio") === 'incomplete' && " - A detailed bio increases profile views by 60%"}
            </p>
          </FieldWrapper>

          {/* Collab Intent Selector */}
          <div className="border-t pt-4">
            <CollabIntentSelector 
              value={editForm.collab_intent}
              onChange={(value) => onFormChange((prev: typeof editForm) => ({ ...prev, collab_intent: value }))}
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

          <Button onClick={onSave} className="w-full" size="lg">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Save Changes {completion.percentage === 100 ? '🎉' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
