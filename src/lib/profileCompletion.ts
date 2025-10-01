import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileCompletionStatus {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
  isComplete: boolean;
  completionPercentage: number;
}

export const checkProfileCompletion = (profile: Profile, portfolioCount: number = 0): ProfileCompletionStatus => {
  const fields = [
    { key: 'full_name', label: 'Full Name', value: profile.full_name && profile.full_name !== 'New User' },
    { key: 'role', label: 'Role/Title', value: profile.role && profile.role !== 'Creator' },
    { key: 'bio', label: 'Bio', value: profile.bio && profile.bio.length > 20 },
    { key: 'avatar_url', label: 'Profile Picture', value: profile.avatar_url },
    { key: 'location', label: 'Location', value: profile.location },
    { key: 'skills', label: 'Skills (3+)', value: (() => {
      const professionalSkills = profile.professional_skills ? 
        (Array.isArray(profile.professional_skills) ? profile.professional_skills.length : Object.keys(profile.professional_skills).length) : 0;
      const passionSkills = profile.passion_skills ? 
        (Array.isArray(profile.passion_skills) ? profile.passion_skills.length : Object.keys(profile.passion_skills).length) : 0;
      return (professionalSkills + passionSkills) >= 3;
    })() },
    { key: 'portfolio', label: 'Portfolio Items', value: portfolioCount >= 1 },
    { key: 'website', label: 'Website or Social Link', value: profile.website || profile.linkedin_url || profile.instagram_url || profile.twitter_url },
  ];

  const completedFields = fields.filter(f => f.value).map(f => f.label);
  const missingFields = fields.filter(f => !f.value).map(f => f.label);
  
  const percentage = Math.round((completedFields.length / fields.length) * 100);
  const isComplete = missingFields.length === 0;

  return {
    percentage,
    missingFields,
    completedFields,
    isComplete,
    completionPercentage: percentage,
  };
};

export const PROFILE_COMPLETION_XP = 50;
