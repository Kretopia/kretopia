import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Smartphone, X, Save, Loader2, Eye, EyeOff,
  GripVertical, ChevronDown, ChevronRight, Wand2,
  PanelLeft, ArrowLeft, Crown, Lock, FileDown, Palette,
  Type, Image as ImageIcon, Plus, Trash2, LayoutTemplate, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hasProAccess, hasCreatorProAccess } from "@/lib/subscriptionConfig";
import { useNavigate } from "react-router-dom";
import type { EPKPdfInput } from "@/lib/epkPdfGenerator";
import { EPK_TEMPLATES, type EPKTemplateId } from "@/lib/epkPdfGenerator";

// Editable sections for the EPK
interface EPKSection {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_SECTIONS: EPKSection[] = [
  { id: "hero", label: "Cover / Hero", visible: true },
  { id: "bio", label: "Bio & About", visible: true },
  { id: "stats", label: "Quick Stats", visible: true },
  { id: "contact", label: "Contact & Links", visible: true },
  { id: "skills", label: "Skills & Expertise", visible: true },
  { id: "credits", label: "Work History", visible: true },
  { id: "press", label: "Press Coverage", visible: true },
  { id: "awards", label: "Awards & Recognition", visible: true },
  { id: "credentials", label: "Credentials & Stats", visible: true },
  { id: "reviews", label: "Client Reviews", visible: true },
];

interface EPKBranding {
  primaryColor: string;
  accentColor: string;
  darkColor: string;
  logoUrl: string;
  tagline: string;
}

interface EPKEditableData {
  displayName: string;
  displayRole: string;
  bio: string;
  location: string;
  tagline: string;
  contactEmail: string;
  sections: EPKSection[];
  branding: EPKBranding;
  // Credits can be reordered/hidden
  creditOverrides: Record<string, { hidden?: boolean; customRole?: string }>;
}

interface EPKPdfEditorProps {
  open: boolean;
  onClose: () => void;
  epkData: EPKPdfInput;
  userId: string;
}

type EditorTab = "content" | "sections" | "template" | "branding";

export const EPKPdfEditor = ({ open, onClose, epkData, userId }: EPKPdfEditorProps) => {
  const { subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPro = hasProAccess((subscriptionInfo?.tier || "free") as any);
  const isCreatorPlus = hasCreatorProAccess((subscriptionInfo?.tier || "free") as any);

  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editable state
  const [displayName, setDisplayName] = useState(epkData.profile.full_name || "");
  const [displayRole, setDisplayRole] = useState(epkData.profile.job_title || epkData.profile.role || "");
  const [bio, setBio] = useState(epkData.profile.bio || "");
  const [location, setLocation] = useState(epkData.profile.location || "");
  const [tagline, setTagline] = useState("");
  const [sections, setSections] = useState<EPKSection[]>(DEFAULT_SECTIONS);
  const [branding, setBranding] = useState<EPKBranding>({
    primaryColor: "#8B5CF6",
    accentColor: "#A882FF",
    darkColor: "#1E1B2D",
    logoUrl: "",
    tagline: "",
  });
  const [creditOverrides, setCreditOverrides] = useState<Record<string, { hidden?: boolean; customRole?: string }>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<EPKTemplateId>('cinematic-dark');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Reset state when data changes
  useEffect(() => {
    if (open && epkData) {
      setDisplayName(epkData.profile.full_name || "");
      setDisplayRole(epkData.profile.job_title || epkData.profile.role || "");
      setBio(epkData.profile.bio || "");
      setLocation(epkData.profile.location || "");
      setHasChanges(false);
    }
  }, [open, epkData]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  // Build modified EPK data from editor state
  const buildModifiedData = useCallback((): EPKPdfInput => {
    const visibleSectionIds = new Set(sections.filter(s => s.visible).map(s => s.id));
    
    return {
      profile: {
        ...epkData.profile,
        full_name: displayName,
        job_title: displayRole,
        role: displayRole,
        bio,
        location,
      },
      credits: visibleSectionIds.has("credits")
        ? epkData.credits.filter(c => {
            const id = (c as any).id;
            return !creditOverrides[id]?.hidden;
          }).map(c => {
            const id = (c as any).id;
            const override = creditOverrides[id];
            return override?.customRole ? { ...c, role: override.customRole } : c;
          })
        : [],
      awards: visibleSectionIds.has("awards") ? epkData.awards : [],
      pressLinks: visibleSectionIds.has("press") ? epkData.pressLinks : [],
      industryStats: visibleSectionIds.has("credentials") ? epkData.industryStats : [],
      reviews: visibleSectionIds.has("reviews") ? epkData.reviews : [],
    };
  }, [epkData, displayName, displayRole, bio, location, sections, creditOverrides]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const modifiedData = buildModifiedData();
      
      if (isCreatorPlus) {
        // Pass custom branding + template
        const { generateEPKPdf } = await import("@/lib/epkPdfGenerator");
        await generateEPKPdf(modifiedData, {
          templateId: selectedTemplate,
          primaryColor: hexToRgb(branding.primaryColor),
          accentColor: hexToRgb(branding.accentColor),
          darkColor: hexToRgb(branding.darkColor),
          logoUrl: branding.logoUrl || undefined,
          tagline: tagline || branding.tagline || undefined,
        });
      } else {
        const { generateEPKPdf } = await import("@/lib/epkPdfGenerator");
        await generateEPKPdf(modifiedData);
      }
      toast({ title: "EPK PDF downloaded!", description: "Your professional EPK deck has been saved." });
    } catch (error) {
      console.error("EPK PDF generation error:", error);
      toast({ title: "Failed to generate PDF", description: "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Section drag & drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...sections];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setSections(updated);
    setDragIndex(index);
    markChanged();
  };
  const handleDragEnd = () => setDragIndex(null);

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
    markChanged();
  };

  if (!open) return null;

  const TABS: { id: EditorTab; label: string; icon: any; proOnly?: boolean }[] = [
    { id: "content", label: "Content", icon: Type },
    { id: "sections", label: "Sections", icon: GripVertical },
    { id: "template", label: "Template", icon: LayoutTemplate, proOnly: true },
    { id: "branding", label: "Branding", icon: Palette, proOnly: true },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold">EPK PDF Editor</h2>
            <p className="text-xs text-muted-foreground">
              {isCreatorPlus ? "Creator+ • Full Branding" : "Creator • Basic Editor"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Unsaved changes</Badge>
          )}
          <Button size="sm" onClick={handleDownload} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {generating ? "Generating..." : "Download PDF"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "border-r bg-muted/30 transition-all duration-200 flex flex-col shrink-0",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
        )}>
          {/* Tab bar */}
          <div className="flex border-b shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const locked = tab.proOnly && !isCreatorPlus;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (locked) {
                      toast({
                        title: "Creator+ feature",
                        description: "Upgrade to Creator+ for custom branding.",
                      });
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                    activeTab === tab.id ? "bg-background text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
                    locked && "opacity-50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {locked && <Lock className="h-3 w-3" />}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {activeTab === "content" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); markChanged(); }}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Title / Role</Label>
                    <Input
                      value={displayRole}
                      onChange={e => { setDisplayRole(e.target.value); markChanged(); }}
                      placeholder="Creative Director, Music Producer, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tagline</Label>
                    <Input
                      value={tagline}
                      onChange={e => { setTagline(e.target.value); markChanged(); }}
                      placeholder="A short tagline for your EPK cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={e => { setBio(e.target.value); markChanged(); }}
                      placeholder="About you..."
                      rows={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Location</Label>
                    <Input
                      value={location}
                      onChange={e => { setLocation(e.target.value); markChanged(); }}
                      placeholder="City, Country"
                    />
                  </div>

                  {/* Credits editing */}
                  {epkData.credits.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold">Credits ({epkData.credits.length})</Label>
                      <p className="text-[10px] text-muted-foreground">Toggle visibility or edit roles</p>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {epkData.credits.map((credit, i) => {
                          const id = (credit as any).id || `credit-${i}`;
                          const override = creditOverrides[id];
                          const isHidden = override?.hidden;
                          return (
                            <div key={id} className={cn(
                              "flex items-center gap-2 p-2 rounded-md border text-xs",
                              isHidden ? "opacity-50 bg-muted/50" : "bg-background"
                            )}>
                              <button
                                onClick={() => {
                                  setCreditOverrides(prev => ({
                                    ...prev,
                                    [id]: { ...prev[id], hidden: !isHidden }
                                  }));
                                  markChanged();
                                }}
                                className="shrink-0"
                              >
                                {isHidden ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{credit.project_name || credit.title}</p>
                                <Input
                                  value={override?.customRole || credit.role}
                                  onChange={e => {
                                    setCreditOverrides(prev => ({
                                      ...prev,
                                      [id]: { ...prev[id], customRole: e.target.value }
                                    }));
                                    markChanged();
                                  }}
                                  className="h-6 text-xs mt-1 px-1.5"
                                  placeholder="Role"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "sections" && (
                <>
                  <p className="text-xs text-muted-foreground">Drag to reorder, toggle visibility</p>
                  <div className="space-y-1">
                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-md border cursor-move transition-colors",
                          dragIndex === index ? "bg-primary/10 border-primary/30" : "bg-background hover:bg-muted/50",
                          !section.visible && "opacity-50"
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium">{section.label}</span>
                        <button onClick={() => toggleSection(section.id)}>
                          {section.visible
                            ? <Eye className="h-4 w-4 text-primary" />
                            : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "template" && isCreatorPlus && (
                <>
                  <p className="text-xs text-muted-foreground">Choose a design template for your EPK deck</p>
                  <div className="space-y-3">
                    {EPK_TEMPLATES.map(tpl => {
                      const isSelected = selectedTemplate === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => {
                            setSelectedTemplate(tpl.id);
                            // Auto-update branding colors to match template
                            setBranding(prev => ({
                              ...prev,
                              primaryColor: rgbToHex(tpl.palette.primary),
                              accentColor: rgbToHex(tpl.palette.accent),
                              darkColor: rgbToHex(tpl.palette.bg),
                            }));
                            markChanged();
                          }}
                          className={cn(
                            "w-full text-left rounded-lg border-2 p-3 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-muted-foreground/30"
                          )}
                        >
                          {/* Preview swatch */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", tpl.previewBg)}>
                              <div className={cn("w-4 h-4 rounded-full", tpl.previewAccent)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{tpl.name}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight">{tpl.description}</p>
                            </div>
                          </div>
                          {/* Color strip preview */}
                          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                            <div className="flex-1" style={{ backgroundColor: rgbToHex(tpl.palette.bg) }} />
                            <div className="flex-1" style={{ backgroundColor: rgbToHex(tpl.palette.primary) }} />
                            <div className="flex-1" style={{ backgroundColor: rgbToHex(tpl.palette.accent) }} />
                            <div className="flex-1" style={{ backgroundColor: rgbToHex(tpl.palette.gold) }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}


                <>
                  <p className="text-xs text-muted-foreground">Customize your EPK branding</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.primaryColor}
                          onChange={e => { setBranding(prev => ({ ...prev, primaryColor: e.target.value })); markChanged(); }}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={branding.primaryColor}
                          onChange={e => { setBranding(prev => ({ ...prev, primaryColor: e.target.value })); markChanged(); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.accentColor}
                          onChange={e => { setBranding(prev => ({ ...prev, accentColor: e.target.value })); markChanged(); }}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={branding.accentColor}
                          onChange={e => { setBranding(prev => ({ ...prev, accentColor: e.target.value })); markChanged(); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Dark / Background Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.darkColor}
                          onChange={e => { setBranding(prev => ({ ...prev, darkColor: e.target.value })); markChanged(); }}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={branding.darkColor}
                          onChange={e => { setBranding(prev => ({ ...prev, darkColor: e.target.value })); markChanged(); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Logo URL</Label>
                      <Input
                        value={branding.logoUrl}
                        onChange={e => { setBranding(prev => ({ ...prev, logoUrl: e.target.value })); markChanged(); }}
                        placeholder="https://your-logo.com/logo.png"
                      />
                      <p className="text-[10px] text-muted-foreground">Appears in the footer of each page</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Footer Tagline</Label>
                      <Input
                        value={branding.tagline}
                        onChange={e => { setBranding(prev => ({ ...prev, tagline: e.target.value })); markChanged(); }}
                        placeholder="Your brand tagline"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Live Preview</span>
            <div />
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
            <EPKPreview
              data={buildModifiedData()}
              branding={isCreatorPlus ? branding : undefined}
              tagline={tagline}
              sections={sections}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Lightweight HTML preview of the EPK
const EPKPreview = ({
  data,
  branding,
  tagline,
  sections,
}: {
  data: EPKPdfInput;
  branding?: EPKBranding;
  tagline?: string;
  sections: EPKSection[];
}) => {
  const primary = branding?.primaryColor || "#8B5CF6";
  const accent = branding?.accentColor || "#A882FF";
  const dark = branding?.darkColor || "#1E1B2D";
  const { profile, credits, awards, pressLinks, industryStats, reviews } = data;

  const visibleIds = new Set(sections.filter(s => s.visible).map(s => s.id));

  return (
    <div className="w-full max-w-[420px] bg-white rounded-lg shadow-xl overflow-hidden text-left" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
      {/* Hero */}
      {visibleIds.has("hero") && (
        <div style={{ background: dark, padding: "2rem 1.5rem", textAlign: "center" }}>
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-20 h-20 rounded-full mx-auto mb-3 border-2"
              style={{ borderColor: primary }}
            />
          )}
          <h1 className="text-xl font-bold" style={{ color: "#fff" }}>{profile.full_name || "Creator"}</h1>
          <p className="text-sm mt-1" style={{ color: accent }}>{profile.job_title || profile.role || "Creative Professional"}</p>
          {profile.location && (
            <p className="text-xs mt-1" style={{ color: "#9494A0" }}>📍 {profile.location}</p>
          )}
          {tagline && (
            <p className="text-xs mt-2 italic" style={{ color: accent }}>{tagline}</p>
          )}
        </div>
      )}

      <div className="px-4 py-3 space-y-4 text-xs" style={{ color: "#3C3C46" }}>
        {/* Bio */}
        {visibleIds.has("bio") && profile.bio && (
          <div>
            <p className="leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        {visibleIds.has("stats") && (
          <div className="flex flex-wrap gap-2 justify-center text-[10px] font-semibold" style={{ color: primary }}>
            {credits.length > 0 && <span>{credits.length} Credits</span>}
            {awards.length > 0 && <span>• {awards.length} Awards</span>}
            {profile.average_rating && <span>• ⭐ {profile.average_rating.toFixed(1)}</span>}
          </div>
        )}

        {/* Credits */}
        {visibleIds.has("credits") && credits.length > 0 && (
          <div>
            <h3 className="font-bold text-xs mb-2 uppercase tracking-wider" style={{ color: primary }}>Work History</h3>
            {credits.slice(0, 8).map((c, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-gray-100">
                <div>
                  <span className="font-semibold">{c.project_name || c.title}</span>
                  {c.isVerified && <span className="ml-1" style={{ color: primary }}>✓</span>}
                  <br />
                  <span className="text-[10px]" style={{ color: "#50505A" }}>{c.role}</span>
                </div>
                {c.year && <span className="text-[10px]" style={{ color: "#9494A0" }}>{c.year}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Awards */}
        {visibleIds.has("awards") && awards.length > 0 && (
          <div>
            <h3 className="font-bold text-xs mb-2 uppercase tracking-wider" style={{ color: primary }}>Awards</h3>
            {awards.map((a, i) => (
              <p key={i} className="py-0.5">🏆 {a.title} — <span style={{ color: "#9494A0" }}>{a.organization}{a.year ? ` • ${a.year}` : ""}</span></p>
            ))}
          </div>
        )}

        {/* Press */}
        {visibleIds.has("press") && pressLinks.length > 0 && (
          <div>
            <h3 className="font-bold text-xs mb-2 uppercase tracking-wider" style={{ color: primary }}>Featured In</h3>
            {pressLinks.map((p, i) => (
              <p key={i} className="py-0.5">{p.title}{p.publication ? ` — ${p.publication}` : ""}</p>
            ))}
          </div>
        )}

        {/* Reviews */}
        {visibleIds.has("reviews") && reviews.length > 0 && (
          <div>
            <h3 className="font-bold text-xs mb-2 uppercase tracking-wider" style={{ color: primary }}>Reviews</h3>
            {reviews.slice(0, 3).map((r, i) => (
              <div key={i} className="py-1 border-b border-gray-100">
                <span style={{ color: primary }}>{"★".repeat(Math.round(r.rating))}</span>
                {r.reviewer_name && <span className="ml-1 font-semibold">— {r.reviewer_name}</span>}
                {r.review_text && <p className="text-[10px] italic mt-0.5" style={{ color: "#50505A" }}>"{r.review_text.slice(0, 120)}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-2 text-center text-[9px]" style={{ background: primary, color: "#fff" }}>
        {branding?.tagline || `${profile.full_name} — EPK • thrivein.io`}
      </div>
    </div>
  );
};

// Utility
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
