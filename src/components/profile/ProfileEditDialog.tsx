import { useState, useEffect, useMemo } from "react";
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
  // LOCAL state - completely isolated from parent during typing
  const [localForm, setLocalForm] = useState({
    full_name: '',
    role: '',
    bio: '',
    location: '',
    collab_intent: '',
  });
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open && !isInitialized) {
      setLocalForm({
        full_name: editForm.full_name || '',
        role: editForm.role || '',
        bio: editForm.bio || '',
        location: editForm.location || '',
        collab_intent: editForm.collab_intent || 'seeking_collaborators',
      });
      setShowCustomRole(!ROLE_OPTIONS.some(opt => opt.value === editForm.role) && !!editForm.role);
      setShowCustomLocation(!LOCATION_OPTIONS.some(opt => opt.value === editForm.location) && !!editForm.location);
      setIsInitialized(true);
    }
    if (!open) {
      setIsInitialized(false);
    }
  }, [open, editForm, isInitialized]);

  // Sync from quick fill (external update)
  useEffect(() => {
    if (open && isInitialized) {
      // Only update if parent data changed significantly (quick fill)
      const parentChanged = 
        editForm.full_name !== localForm.full_name ||
        editForm.role !== localForm.role ||
        editForm.bio !== localForm.bio ||
        editForm.location !== localForm.location;
      
      // Check if it's a quick fill by looking for substantial changes
      if (parentChanged && editForm.full_name && editForm.full_name !== localForm.full_name) {
        setLocalForm({
          full_name: editForm.full_name || '',
          role: editForm.role || '',
          bio: editForm.bio || '',
          location: editForm.location || '',
          collab_intent: editForm.collab_intent || localForm.collab_intent,
        });
      }
    }
  }, [editForm.full_name, editForm.role, editForm.bio, editForm.location]);

  // Handle save - sync local state to parent and trigger save
  const handleSave = () => {
    onFormChange({
      ...editForm,
      full_name: localForm.full_name,
      role: localForm.role,
      bio: localForm.bio,
      location: localForm.location,
      collab_intent: localForm.collab_intent,
    });
    // Small delay to ensure state is synced before save
    setTimeout(() => {
      onSave();
    }, 50);
  };

  // Calculate completion based on local state
  const completion = useMemo((): ProfileCompletionStatus => {
    const tempProfile = {
      ...profile,
      full_name: localForm.full_name,
      role: localForm.role,
      bio: localForm.bio,
      location: localForm.location,
      avatar_url: editForm.avatar_url,
    };
    return checkProfileCompletion(tempProfile, portfolioCount);
  }, [profile, localForm, editForm.avatar_url, portfolioCount]);

  const getFieldStatus = (fieldLabel: string) => {
    return completion.completedFields.includes(fieldLabel) ? 'complete' : 'incomplete';
  };

  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === localForm.role);
  const isLocationInOptions = LOCATION_OPTIONS.some(opt => opt.value === localForm.location);

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
              value={localForm.full_name}
              onChange={(e) => setLocalForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Your full name"
              autoComplete="off"
            />
            {getFieldStatus("Full Name") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                Add your full name to help others recognize you
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Role/Title" fieldLabel="Role/Title">
            {showCustomRole || (!isRoleInOptions && localForm.role) ? (
              <div className="space-y-2">
                <Input
                  id="role"
                  value={localForm.role}
                  onChange={(e) => setLocalForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Enter your role"
                  autoComplete="off"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCustomRole(false);
                    setLocalForm(prev => ({ ...prev, role: '' }));
                  }}
                >
                  Choose from list instead
                </Button>
              </div>
            ) : (
              <Select 
                value={localForm.role || undefined}
                onValueChange={(value) => {
                  if (value === 'Other') {
                    setShowCustomRole(true);
                    setLocalForm(prev => ({ ...prev, role: '' }));
                  } else {
                    setLocalForm(prev => ({ ...prev, role: value }));
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
            {showCustomLocation || (!isLocationInOptions && localForm.location) ? (
              <div className="space-y-2">
                <Input
                  id="location"
                  value={localForm.location}
                  onChange={(e) => setLocalForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter your location"
                  autoComplete="off"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCustomLocation(false);
                    setLocalForm(prev => ({ ...prev, location: '' }));
                  }}
                >
                  Choose from list instead
                </Button>
              </div>
            ) : (
              <Select 
                value={localForm.location || undefined}
                onValueChange={(value) => {
                  if (value === 'Other') {
                    setShowCustomLocation(true);
                    setLocalForm(prev => ({ ...prev, location: '' }));
                  } else {
                    setLocalForm(prev => ({ ...prev, location: value }));
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

          <FieldWrapper label="Bio" fieldLabel="Bio (20+ chars)">
            <Textarea
              id="bio"
              value={localForm.bio}
              onChange={(e) => setLocalForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              placeholder="Tell others about yourself, your experience, and what you're looking for... (minimum 20 characters)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {localForm.bio?.length || 0}/20 characters minimum
              {getFieldStatus("Bio (20+ chars)") === 'incomplete' && " - A detailed bio increases profile views by 60%"}
            </p>
          </FieldWrapper>

          {/* Collab Intent Selector */}
          <div className="border-t pt-4">
            <CollabIntentSelector 
              value={localForm.collab_intent}
              onChange={(value) => setLocalForm(prev => ({ ...prev, collab_intent: value }))}
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
      </DialogContent>
    </Dialog>
  );
};