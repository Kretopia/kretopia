import { useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, Camera, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface CompanyProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: {
    full_name: string;
    role: string;
    bio: string;
    location: string;
    avatar_url: string;
    company_size: string;
  };
  onFormChange: (form: any) => void;
  onSave: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
  galleryPreviews: string[];
  onGalleryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveGalleryImage: (index: number) => void;
}

export const CompanyProfileEditDialog = ({
  open,
  onOpenChange,
  editForm,
  onFormChange,
  onSave,
  onAvatarUpload,
  isUploadingAvatar,
  galleryPreviews,
  onGalleryChange,
  onRemoveGalleryImage,
}: CompanyProfileEditDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate completion
  const calculateCompletion = () => {
    const fields = [
      { label: 'Company Name', value: editForm.full_name && editForm.full_name !== 'New User' },
      { label: 'Industry', value: editForm.role && editForm.role !== 'Creator' },
      { label: 'Company Logo', value: editForm.avatar_url },
      { label: 'Address', value: editForm.location },
      { label: 'Company Size', value: editForm.company_size },
      { label: 'About', value: editForm.bio && editForm.bio.length > 20 },
    ];

    const completed = fields.filter(f => f.value).length;
    const total = fields.length;
    const percentage = Math.round((completed / total) * 100);
    const missing = fields.filter(f => !f.value).map(f => f.label);

    return { percentage, missing, completed, total };
  };

  const completion = calculateCompletion();

  const getFieldStatus = (fieldLabel: string) => {
    return completion.missing.includes(fieldLabel) ? 'incomplete' : 'complete';
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Complete Company Profile
          </DialogTitle>
          <DialogDescription>
            Fill in your company information to attract talent and opportunities
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
            {completion.missing.length === 0 ? (
              <span className="text-primary font-medium">🎉 Your company profile is complete!</span>
            ) : (
              <>
                Complete {completion.missing.length} more {completion.missing.length === 1 ? 'field' : 'fields'} to reach 100%
              </>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <FieldWrapper label="Company Logo" fieldLabel="Company Logo">
            <div className="flex items-center gap-4 mt-2">
              <Avatar className="h-20 w-20 rounded-lg">
                <AvatarImage src={editForm.avatar_url} />
                <AvatarFallback>
                  <Building2 className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarUpload}
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  size="sm"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Change Logo
                    </>
                  )}
                </Button>
              </div>
            </div>
            {getFieldStatus("Company Logo") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                A company logo builds trust and recognition
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Company Name" fieldLabel="Company Name">
            <Input
              id="full_name"
              value={editForm.full_name}
              onChange={(e) => onFormChange({ ...editForm, full_name: e.target.value })}
              placeholder="Your company name"
            />
          </FieldWrapper>

          <FieldWrapper label="Industry" fieldLabel="Industry">
            <Input
              id="role"
              value={editForm.role}
              onChange={(e) => onFormChange({ ...editForm, role: e.target.value })}
              placeholder="e.g., Technology, Marketing, Entertainment"
            />
          </FieldWrapper>

          <FieldWrapper label="Company Size" fieldLabel="Company Size">
            <Input
              id="company_size"
              value={editForm.company_size}
              onChange={(e) => onFormChange({ ...editForm, company_size: e.target.value })}
              placeholder="e.g., 1-10 employees"
            />
            {getFieldStatus("Company Size") === 'incomplete' && (
              <p className="text-xs text-muted-foreground mt-1">
                Company size helps creators understand your scale
              </p>
            )}
          </FieldWrapper>

          <FieldWrapper label="Address" fieldLabel="Address">
            <Input
              id="location"
              value={editForm.location}
              onChange={(e) => onFormChange({ ...editForm, location: e.target.value })}
              placeholder="Company address"
            />
          </FieldWrapper>

          <FieldWrapper label="About" fieldLabel="About">
            <Textarea
              id="bio"
              value={editForm.bio}
              onChange={(e) => onFormChange({ ...editForm, bio: e.target.value })}
              placeholder="Tell creators about your company, mission, and what makes you unique... (minimum 20 characters)"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {editForm.bio.length}/20 characters minimum
            </p>
          </FieldWrapper>

          <div>
            <Label>Gallery Images (Optional)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={onGalleryChange}
              className="mt-2"
            />
            {galleryPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {galleryPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => onRemoveGalleryImage(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Fields Reminder */}
          {completion.missing.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Still Missing
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {completion.missing.map((field) => (
                  <li key={field} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Save Changes {completion.percentage === 100 ? '🎉' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
