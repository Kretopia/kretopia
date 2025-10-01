import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Star, Sparkles, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  skill: string;
  level: number;
  category: string;
}

interface SkillsSectionProps {
  professionalSkills: Skill[];
  passionSkills: Skill[];
  jobTitle?: string;
  industry?: string;
  isOwnProfile: boolean;
  onRefresh: () => void;
}

// Predefined skills by category for easy selection
const SKILL_OPTIONS: Record<string, string[]> = {
  "Photography & Visual": [
    "Portrait Photography", "Fashion Photography", "Product Photography", "Event Photography",
    "Landscape Photography", "Food Photography", "Architectural Photography", "Street Photography"
  ],
  "Video & Film": [
    "Videography", "Film Production", "Cinematography", "Video Editing",
    "Color Grading", "Documentary Filmmaking", "Commercial Production", "Music Videos"
  ],
  "Audio & Music": [
    "Music Production", "Audio Engineering", "Sound Design", "Mixing & Mastering",
    "Composition", "Beat Making", "Podcast Production", "Voiceover"
  ],
  "Design": [
    "Graphic Design", "UI/UX Design", "Brand Design", "Logo Design",
    "Illustration", "Typography", "Print Design", "Packaging Design"
  ],
  "Motion & Animation": [
    "Motion Graphics", "2D Animation", "3D Animation", "VFX",
    "After Effects", "Character Animation", "Stop Motion"
  ],
  "Content & Social": [
    "Content Creation", "Social Media Management", "Copywriting", "Influencer Marketing",
    "YouTube Content", "TikTok Content", "Instagram Strategy", "Community Management"
  ],
  "Creative Direction": [
    "Creative Direction", "Art Direction", "Brand Strategy", "Campaign Development",
    "Project Management", "Team Leadership"
  ],
  "Technical": [
    "Web Development", "Mobile Development", "3D Modeling", "Game Design",
    "Virtual Reality", "Augmented Reality", "Technical Direction"
  ]
};

export const SkillsSection = ({ 
  professionalSkills = [], 
  passionSkills = [], 
  jobTitle = "",
  industry = "",
  isOwnProfile, 
  onRefresh 
}: SkillsSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState(jobTitle);
  const [editIndustry, setEditIndustry] = useState(industry);
  const [editProfessional, setEditProfessional] = useState<Skill[]>(professionalSkills);
  const [editPassion, setEditPassion] = useState<Skill[]>(passionSkills);
  const [selectedCategory, setSelectedCategory] = useState<string>(Object.keys(SKILL_OPTIONS)[0]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<number>(3);
  const [skillType, setSkillType] = useState<"professional" | "passion">("professional");
  const { toast } = useToast();

  const addSkill = () => {
    if (!selectedSkill.trim()) {
      toast({ title: "Please select a skill", variant: "destructive" });
      return;
    }
    
    const newSkillObj = { skill: selectedSkill, level: selectedLevel, category: selectedCategory };
    
    if (skillType === "professional") {
      if (editProfessional.some(s => s.skill === selectedSkill)) {
        toast({ title: "Skill already added", variant: "destructive" });
        return;
      }
      setEditProfessional([...editProfessional, newSkillObj]);
    } else {
      if (editPassion.some(s => s.skill === selectedSkill)) {
        toast({ title: "Skill already added", variant: "destructive" });
        return;
      }
      setEditPassion([...editPassion, newSkillObj]);
    }
    
    setSelectedSkill("");
    setSelectedLevel(3);
  };

  const removeSkill = (type: string, index: number) => {
    if (type === "professional") {
      setEditProfessional(editProfessional.filter((_, i) => i !== index));
    } else {
      setEditPassion(editPassion.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        job_title: editJobTitle,
        industry: editIndustry,
        professional_skills: editProfessional as any,
        passion_skills: editPassion as any,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update skills", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Skills updated successfully" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  const SkillBadge = ({ skill }: { skill: Skill }) => (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2">
      <div className="flex-1">
        <p className="font-medium text-sm">{skill.skill}</p>
        <p className="text-xs text-muted-foreground">{skill.category}</p>
      </div>
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < skill.level ? 'fill-primary text-primary' : 'text-muted'}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Skills & Expertise</h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Edit Skills
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Your Skills</DialogTitle>
                <DialogDescription>Add and organize your professional and passion skills</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={editJobTitle}
                      onChange={(e) => setEditJobTitle(e.target.value)}
                      placeholder="e.g., Creative Director, Photographer, Music Producer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      placeholder="e.g., Film & Video, Music, Design, Marketing"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Professional Skills
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="grid gap-3">
                      <Select value={skillType} onValueChange={(v: "professional" | "passion") => setSkillType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional Skill</SelectItem>
                          <SelectItem value="passion">Passion / Hobby</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(SKILL_OPTIONS).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_OPTIONS[selectedCategory]?.map(skill => (
                            <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={String(selectedLevel)} onValueChange={(v) => setSelectedLevel(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">⭐ Beginner</SelectItem>
                          <SelectItem value="2">⭐⭐ Intermediate</SelectItem>
                          <SelectItem value="3">⭐⭐⭐ Proficient</SelectItem>
                          <SelectItem value="4">⭐⭐⭐⭐ Advanced</SelectItem>
                          <SelectItem value="5">⭐⭐⭐⭐⭐ Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button onClick={addSkill} className="w-full" variant="gradient" size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add {skillType === "professional" ? "Professional" : "Passion"} Skill
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {editProfessional.map((skill, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border p-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{skill.skill}</p>
                            <p className="text-xs text-muted-foreground">{skill.category}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(skill.level)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeSkill("professional", idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    Passion Skills Added
                  </h4>
                  <div className="space-y-2">
                    {editPassion.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border p-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{skill.skill}</p>
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(skill.level)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-secondary text-secondary" />
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSkill("passion", idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {editPassion.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No passion skills added yet</p>
                    )}
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full" variant="gradient">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(jobTitle || industry) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          {jobTitle && <p className="font-semibold text-lg">{jobTitle}</p>}
          {industry && <p className="text-sm text-muted-foreground">{industry}</p>}
        </div>
      )}

      {professionalSkills.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-primary" />
            Professional Skills
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionalSkills.map((skill, idx) => (
              <SkillBadge key={idx} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {passionSkills.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-secondary" />
            Passion Projects & Hobbies
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {passionSkills.map((skill, idx) => (
              <SkillBadge key={idx} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {professionalSkills.length === 0 && passionSkills.length === 0 && !isOwnProfile && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No skills added yet</p>
        </div>
      )}
    </div>
  );
};
