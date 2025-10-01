import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

const SKILL_CATEGORIES = [
  "Creative", "Technical", "Business", "Communication", "Design", 
  "Production", "Marketing", "Development", "Music", "Video", "Photography"
];

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
  const [newSkill, setNewSkill] = useState({ skill: "", level: 3, category: "Creative", type: "professional" });
  const { toast } = useToast();

  const addSkill = () => {
    if (!newSkill.skill.trim()) return;
    
    if (newSkill.type === "professional") {
      setEditProfessional([...editProfessional, { skill: newSkill.skill, level: newSkill.level, category: newSkill.category }]);
    } else {
      setEditPassion([...editPassion, { skill: newSkill.skill, level: newSkill.level, category: newSkill.category }]);
    }
    setNewSkill({ skill: "", level: 3, category: "Creative", type: newSkill.type });
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Skill name"
                          value={newSkill.type === "professional" ? newSkill.skill : ""}
                          onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value, type: "professional" })}
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        />
                      </div>
                      <Select value={newSkill.category} onValueChange={(v) => setNewSkill({ ...newSkill, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(newSkill.level)} onValueChange={(v) => setNewSkill({ ...newSkill, level: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Beginner</SelectItem>
                          <SelectItem value="2">Intermediate</SelectItem>
                          <SelectItem value="3">Proficient</SelectItem>
                          <SelectItem value="4">Advanced</SelectItem>
                          <SelectItem value="5">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={addSkill} className="col-span-2" size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Skill
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

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    Passion Projects & Hobbies
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Skill name"
                          value={newSkill.type === "passion" ? newSkill.skill : ""}
                          onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value, type: "passion" })}
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        />
                      </div>
                      <Select value={newSkill.category} onValueChange={(v) => setNewSkill({ ...newSkill, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(newSkill.level)} onValueChange={(v) => setNewSkill({ ...newSkill, level: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Beginner</SelectItem>
                          <SelectItem value="2">Intermediate</SelectItem>
                          <SelectItem value="3">Proficient</SelectItem>
                          <SelectItem value="4">Advanced</SelectItem>
                          <SelectItem value="5">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => { setNewSkill({ ...newSkill, type: "passion" }); addSkill(); }} className="col-span-2" size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Skill
                      </Button>
                    </div>
                    
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
                    </div>
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
