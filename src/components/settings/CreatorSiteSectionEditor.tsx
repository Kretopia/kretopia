import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Eye, EyeOff, Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SiteSection {
  id: string;
  label: string;
  visible: boolean;
  customTitle?: string;
  customContent?: string;
}

export interface CustomBlock {
  id: string;
  type: 'text' | 'image' | 'cta';
  title?: string;
  content?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
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
  initialCustomBlocks?: CustomBlock[];
}

export const CreatorSiteSectionEditor = ({ initialSections, initialHeadline, initialBio, initialCustomBlocks }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SiteSection[]>(initialSections?.length ? initialSections : DEFAULT_SECTIONS);
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [bio, setBio] = useState(initialBio || "");
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>(initialCustomBlocks || []);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const updateSectionTitle = (id: string, customTitle: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, customTitle } : s));
  };

  const updateSectionContent = (id: string, customContent: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, customContent } : s));
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

  const addCustomBlock = (type: CustomBlock['type']) => {
    const newBlock: CustomBlock = {
      id: `block-${Date.now()}`,
      type,
      title: type === 'cta' ? 'Call to Action' : '',
      content: '',
      buttonText: type === 'cta' ? 'Get in Touch' : undefined,
      buttonUrl: type === 'cta' ? '#contact' : undefined,
    };
    setCustomBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<CustomBlock>) => {
    setCustomBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setCustomBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleImageUpload = useCallback(async (blockId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-site-${Date.now()}.${fileExt}`;
      const filePath = `site-blocks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      updateBlock(blockId, { imageUrl: publicUrl });
      toast({ title: "Image uploaded!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [user, toast]);

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

        {/* Section order with inline editing */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Section Order & Visibility</Label>
          <p className="text-xs text-muted-foreground mb-2">Drag to reorder. Click to expand and edit content. Toggle to show/hide.</p>
          <div className="space-y-1">
            {sections.map((section, index) => (
              <div key={section.id}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                    dragIndex === index ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:bg-muted/50'
                  } ${!section.visible ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="flex items-center gap-1 flex-1 text-left"
                  >
                    {expandedSection === section.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{section.customTitle || section.label}</span>
                  </button>
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

                {/* Expanded inline editor */}
                {expandedSection === section.id && (
                  <div className="ml-8 mr-2 mt-1 mb-2 p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase">Section Title Override</Label>
                      <Input
                        placeholder={section.label}
                        value={section.customTitle || ""}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    {section.id !== 'hero' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Custom Subtitle / Description</Label>
                        <Textarea
                          placeholder="Add a custom subtitle for this section..."
                          value={section.customContent || ""}
                          onChange={(e) => updateSectionContent(section.id, e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {section.id === 'credits' && "Your verified credits are pulled automatically from your profile."}
                      {section.id === 'services' && "Services are pulled automatically from your Work With Me listings."}
                      {section.id === 'testimonials' && "Testimonials come from your endorsements and client reviews."}
                      {section.id === 'contact' && "Contact section uses your profile social links and booking URL."}
                      {section.id === 'hero' && "Hero uses your headline, bio, avatar, and cover image from above."}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Blocks */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Custom Content Blocks</Label>
          <p className="text-xs text-muted-foreground mb-2">Add custom sections to your site beyond the standard data blocks.</p>

          {customBlocks.map((block) => (
            <div key={block.id} className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {block.type === 'text' && '📝 Text Block'}
                  {block.type === 'image' && '🖼️ Image Block'}
                  {block.type === 'cta' && '🔗 Call to Action'}
                </span>
                <button onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
              <Input
                placeholder="Block title"
                value={block.title || ""}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                className="text-xs h-8"
              />
              {block.type === 'text' && (
                <Textarea
                  placeholder="Write your content..."
                  value={block.content || ""}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              )}
              {block.type === 'image' && (
                <div className="space-y-2">
                  {block.imageUrl ? (
                    <div className="relative">
                      <img src={block.imageUrl} alt="" className="w-full h-32 object-cover rounded-md" />
                      <button
                        onClick={() => updateBlock(block.id, { imageUrl: '' })}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="text-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <span className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(block.id, file);
                        }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                  <Textarea
                    placeholder="Image caption (optional)"
                    value={block.content || ""}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    rows={1}
                    className="text-xs resize-none"
                  />
                </div>
              )}
              {block.type === 'cta' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Button text"
                    value={block.buttonText || ""}
                    onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="Button URL"
                    value={block.buttonUrl || ""}
                    onChange={(e) => updateBlock(block.id, { buttonUrl: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => addCustomBlock('text')}>
              <Plus className="h-3 w-3 mr-1" /> Text
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => addCustomBlock('image')}>
              <Plus className="h-3 w-3 mr-1" /> Image
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => addCustomBlock('cta')}>
              <Plus className="h-3 w-3 mr-1" /> CTA
            </Button>
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
