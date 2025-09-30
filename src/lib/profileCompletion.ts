import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileCompletionStatus {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

export const checkProfileCompletion = (profile: Profile): ProfileCompletionStatus => {
  const fields = [
    { key: 'avatar_url', label: 'Profile Picture', value: profile.avatar_url },
    { key: 'bio', label: 'Bio', value: profile.bio },
    { key: 'location', label: 'Location', value: profile.location },
    { key: 'website', label: 'Website or Social Link', value: profile.website || profile.linkedin_url || profile.instagram_url || profile.twitter_url },
  ];

  const completedFields = fields.filter(f => f.value).map(f => f.label);
  const missingFields = fields.filter(f => !f.value).map(f => f.label);
  
  const percentage = Math.round((completedFields.length / fields.length) * 100);

  return {
    percentage,
    missingFields,
    completedFields,
  };
};

export const PROFILE_COMPLETION_XP = 50;
