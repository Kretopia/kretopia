import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface AboutSectionProps {
  bio?: string;
  jobTitle?: string;
  industry?: string;
  skills?: any[];
  availability?: 'available' | 'busy' | 'unavailable';
  responseTime?: string;
  isOwnProfile?: boolean;
}

export const AboutSection = ({
  bio,
  jobTitle,
  industry,
  skills = [],
  availability = 'available',
  responseTime = '24 hours',
  isOwnProfile
}: AboutSectionProps) => {
  const availabilityConfig = {
    available: { 
      label: 'Available for work', 
      color: 'bg-green-500',
      variant: 'default' as const
    },
    busy: { 
      label: 'Limited availability', 
      color: 'bg-yellow-500',
      variant: 'secondary' as const
    },
    unavailable: { 
      label: 'Not available', 
      color: 'bg-red-500',
      variant: 'outline' as const
    }
  };

  const config = availabilityConfig[availability];
  
  // Get professional skills
  const professionalSkills = Array.isArray(skills) 
    ? skills.filter((s: any) => s.category === 'professional').slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      {/* About Card */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">About</h2>
            {jobTitle && (
              <p className="text-lg text-muted-foreground">{jobTitle}</p>
            )}
          </div>
          
          {/* Availability Badge */}
          <Badge 
            variant={config.variant}
            className="gap-2 px-3 py-1.5 whitespace-nowrap"
          >
            <div className={cn("h-2 w-2 rounded-full", config.color)} />
            {config.label}
          </Badge>
        </div>

        {bio && (
          <p className="text-muted-foreground leading-relaxed text-base">
            {bio}
          </p>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          {industry && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Industry</div>
                <div className="font-medium">{industry}</div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Response Time</div>
              <div className="font-medium">{responseTime}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Skills Card */}
      {professionalSkills.length > 0 && (
        <Card className="p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Skills & Expertise</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {professionalSkills.map((skill: any, index: number) => (
              <Badge 
                key={index}
                variant="secondary"
                className="px-4 py-2 text-sm font-medium"
              >
                {skill.skill}
                {skill.level && (
                  <span className="ml-2 text-primary">
                    {'⭐'.repeat(skill.level)}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
