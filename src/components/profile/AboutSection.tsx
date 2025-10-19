import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Clock, 
  Award,
  CheckCircle2
} from "lucide-react";

interface AboutSectionProps {
  bio?: string;
  jobTitle?: string;
  industry?: string;
  skills?: any[];
  availability?: string;
  responseTime?: number;
  isOwnProfile?: boolean;
}

export function AboutSection({
  bio,
  jobTitle,
  industry,
  skills = [],
  availability,
  responseTime,
  isOwnProfile = false
}: AboutSectionProps) {
  const availabilityStatus = availability || 'available';
  const availabilityColors = {
    available: 'bg-success text-success-foreground',
    busy: 'bg-warning text-warning-foreground',
    unavailable: 'bg-destructive text-destructive-foreground'
  };

  return (
    <div className="space-y-6">
      {/* About Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">About</h2>
        <div className="space-y-4">
          {bio ? (
            <p className="text-muted-foreground leading-relaxed">{bio}</p>
          ) : (
            <p className="text-muted-foreground leading-relaxed italic">No bio added yet.</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            {jobTitle && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{jobTitle}</span>
              </div>
            )}
            
            {industry && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>{industry}</span>
              </div>
            )}
            
            {responseTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{responseTime}% Response Rate</span>
              </div>
            )}
          </div>

          {availability && (
            <div className="flex items-center gap-2">
              <Badge className={availabilityColors[availabilityStatus as keyof typeof availabilityColors]}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {availabilityStatus.charAt(0).toUpperCase() + availabilityStatus.slice(1)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Skills & Expertise */}
      {skills.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Skills & Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => {
              const skillName = typeof skill === 'string' ? skill : skill.name;
              const skillLevel = typeof skill === 'object' ? skill.level : undefined;
              
              return (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="gap-1"
                >
                  {skillName}
                  {skillLevel && (
                    <span className="text-xs opacity-70">
                      {"★".repeat(skillLevel)}
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
