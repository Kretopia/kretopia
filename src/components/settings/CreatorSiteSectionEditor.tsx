import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SiteSection {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_SECTIONS: SiteSection[] = [
  { id: "hero", label: "Hero", visible: true },
  { id: "services", label: "Services", visible: true },
  { id: "credits", label: "Work & Credits", visible: true },
  { id: "testimonials", label: "Testimonials", visible: true },
  { id: "contact", label: "Contact", visible: true },
];

interface Props {
  initialSections?: SiteSection[];
  initialHeadline?: string;
  initialBio?: string;
}

export const CreatorSiteSectionEditor = ({ initialSections, initialHeadline, initialBio }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SiteSection[]>(initialSections?.length ? initialSections : DEFAULT_SECTIONS);
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [bio, setBio] = useState(initialBio || "");
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...sections];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setSections(updated);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        site_sections: sections as any,
        site_headline: headline || null,
        site_bio: bio || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Site customizations saved!" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customize Your Site</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Custom headline */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Custom Headline</Label>
          <Input
            placeholder="e.g. Award-Winning Director & Visual Storyteller"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">Overrides your role/title on your site. Leave blank to use your profile role.</p>
        </div>

        {/* Custom bio */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Site Bio</Label>
          <Textarea
            placeholder="Write a custom bio for your site visitors..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">A custom bio just for your site. Leave blank to use your profile bio.</p>
        </div>

        {/* Section order */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Section Order & Visibility</Label>
          <p className="text-xs text-muted-foreground mb-2">Drag to reorder. Toggle to show/hide sections.</p>
          <div className="space-y-1">
            {sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === index ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:bg-muted/50'
                } ${!section.visible ? 'opacity-50' : ''}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium">{section.label}</span>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="p-1 rounded hover:bg-muted"
                >
                  {section.visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
};
