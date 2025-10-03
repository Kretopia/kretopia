import { supabase } from "@/integrations/supabase/client";

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
  bio?: string | null;
  professional_skills?: any;
  passion_skills?: any;
  location?: string | null;
}

interface ScoredProfile extends Profile {
  ai_match_score?: number;
  match_reasons?: string[];
}

export const scoreProfilesWithAI = async (
  currentUserProfile: Profile,
  potentialMatches: Profile[]
): Promise<ScoredProfile[]> => {
  try {
    // Prepare data for AI analysis
    const mySkills = [
      ...(Array.isArray(currentUserProfile.professional_skills) 
        ? currentUserProfile.professional_skills 
        : Object.keys(currentUserProfile.professional_skills || {})),
      ...(Array.isArray(currentUserProfile.passion_skills) 
        ? currentUserProfile.passion_skills 
        : Object.keys(currentUserProfile.passion_skills || {}))
    ];

    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: {
        messages: [
          {
            role: 'user',
            content: `Score potential collaboration matches for this user:

MY PROFILE:
Name: ${currentUserProfile.full_name}
Role: ${currentUserProfile.role}
Location: ${currentUserProfile.location || 'Not specified'}
Bio: ${currentUserProfile.bio || 'No bio'}
Skills: ${mySkills.join(', ')}

POTENTIAL MATCHES:
${potentialMatches.map((p, i) => {
  const theirSkills = [
    ...(Array.isArray(p.professional_skills) ? p.professional_skills : Object.keys(p.professional_skills || {})),
    ...(Array.isArray(p.passion_skills) ? p.passion_skills : Object.keys(p.passion_skills || {}))
  ];
  return `${i}. ${p.full_name} - ${p.role}
   Location: ${p.location || 'Not specified'}
   Bio: ${p.bio || 'No bio'}
   Skills: ${theirSkills.join(', ')}`;
}).join('\n\n')}

For each match, provide:
1. Match score (0-100) based on collaboration potential
2. 2-3 specific reasons why they'd be a good match

Consider:
- Complementary skills (not identical)
- Similar creative vision
- Location compatibility
- Role synergy
- Bio alignment

Return ONLY valid JSON array:
[{"index": 0, "score": 85, "reasons": ["reason1", "reason2"]}]`
          }
        ],
        type: 'suggest'
      }
    });

    if (error) {
      console.error('AI scoring error:', error);
      return potentialMatches; // Return unscored if AI fails
    }

    // Parse AI response
    const scores = data?.content ? JSON.parse(data.content) : [];

    // Merge scores with profiles
    return potentialMatches.map((profile, index) => {
      const scoreData = scores.find((s: any) => s.index === index);
      return {
        ...profile,
        ai_match_score: scoreData?.score || 50, // Default to 50 if no score
        match_reasons: scoreData?.reasons || []
      };
    });

  } catch (error) {
    console.error('Error in AI match scoring:', error);
    return potentialMatches; // Return unscored profiles on error
  }
};
