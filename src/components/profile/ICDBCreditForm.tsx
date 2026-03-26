import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Search, Loader2, MapPin, Calendar, Link2, Users, Building2, Sparkles, ChevronRight, Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const PROJECT_TYPES = [
  { label: "Film & TV", value: "film_tv", items: [
    { value: "film", label: "Film / Movie" },
    { value: "tv", label: "TV Show / Series" },
    { value: "short_film", label: "Short Film" },
    { value: "documentary", label: "Documentary" },
    { value: "music_video", label: "Music Video" },
    { value: "web_series", label: "Web Series" },
  ]},
  { label: "Music & Audio", value: "music", items: [
    { value: "album", label: "Album" },
    { value: "single", label: "Single / Track" },
    { value: "ep", label: "EP" },
    { value: "podcast", label: "Podcast" },
    { value: "audiobook", label: "Audiobook" },
  ]},
  { label: "Performing Arts", value: "performing", items: [
    { value: "theatre", label: "Theatre / Play" },
    { value: "musical", label: "Musical Theatre" },
    { value: "dance", label: "Dance Performance" },
    { value: "comedy", label: "Stand-up / Comedy" },
    { value: "spoken_word", label: "Spoken Word" },
    { value: "opera", label: "Opera" },
  ]},
  { label: "Events & Productions", value: "events", items: [
    { value: "live_event", label: "Live Event" },
    { value: "concert", label: "Concert" },
    { value: "festival", label: "Festival" },
    { value: "carnival", label: "Carnival / Mas" },
    { value: "pageant", label: "Pageant" },
    { value: "fashion_show", label: "Fashion Show" },
    { value: "awards_show", label: "Awards Ceremony" },
    { value: "exhibition", label: "Exhibition / Gallery" },
    { value: "conference", label: "Conference / Summit" },
  ]},
  { label: "Content & Digital", value: "digital", items: [
    { value: "youtube_series", label: "YouTube Series" },
    { value: "ugc_campaign", label: "UGC Campaign" },
    { value: "livestream", label: "Livestream" },
    { value: "online_course", label: "Online Course" },
    { value: "workshop", label: "Workshop" },
  ]},
  { label: "Commercial", value: "commercial", items: [
    { value: "commercial", label: "TV / Radio Ad" },
    { value: "brand_campaign", label: "Brand Campaign" },
    { value: "corporate", label: "Corporate" },
    { value: "voiceover", label: "Voiceover" },
    { value: "influencer_campaign", label: "Influencer Campaign" },
  ]},
  { label: "Art & Design", value: "art", items: [
    { value: "art_exhibition", label: "Art Exhibition" },
    { value: "mural", label: "Mural / Installation" },
    { value: "graphic_design", label: "Graphic Design Project" },
    { value: "photography", label: "Photography Project" },
    { value: "animation", label: "Animation" },
  ]},
  { label: "Fashion & Beauty", value: "fashion", items: [
    { value: "fashion_collection", label: "Fashion Collection" },
    { value: "editorial_shoot", label: "Editorial Shoot" },
    { value: "runway", label: "Runway Show" },
    { value: "beauty_campaign", label: "Beauty Campaign" },
    { value: "styling", label: "Styling Project" },
  ]},
  { label: "Business & Industry", value: "business", items: [
    { value: "talent_management", label: "Talent Management" },
    { value: "booking", label: "Booking / Representation" },
    { value: "label_release", label: "Label Release" },
    { value: "publishing", label: "Publishing Deal" },
    { value: "curation", label: "Curation / Programming" },
  ]},
];

interface CollaboratorResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface WebCreditResult {
  title: string;
  type: string;
  role_suggestion: string | null;
  year: number | null;
  platform: string | null;
  description: string | null;
  url: string | null;
  location: string | null;
  client_brand: string | null;
}

interface ICDBCreditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

type FormStep = "search" | "details";

export function ICDBCreditForm({ open, onOpenChange, onSuccess, userId }: ICDBCreditFormProps) {
  const [step, setStep] = useState<FormStep>("search");
  const [saving, setSaving] = useState(false);
  
  // AI Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [webResults, setWebResults] = useState<WebCreditResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Collaborator state
  const [collabSearch, setCollabSearch] = useState("");
  const [collabResults, setCollabResults] = useState<CollaboratorResult[]>([]);
  const [searchingCollabs, setSearchingCollabs] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorResult[]>([]);

  const [form, setForm] = useState({
    project_name: "",
    project_type: "",
    role: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    platform: "",
    url: "",
    client_brand: "",
    credit_category: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // AI-powered web search
  const handleAISearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-credits-web', {
        body: { query: searchQuery },
      });

      if (error) throw error;
      setWebResults(data?.results || []);
    } catch (err) {
      console.error('AI search error:', err);
      toast.error('Search temporarily unavailable');
      setWebResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Claim a web result — auto-fill form
  const claimResult = (result: WebCreditResult) => {
    setForm({
      project_name: result.title,
      project_type: result.type || "",
      role: result.role_suggestion || "",
      description: result.description || "",
      start_date: result.year ? `${result.year}-01-01` : "",
      end_date: "",
      location: result.location || "",
      platform: result.platform || "",
      url: result.url || "",
      client_brand: result.client_brand || "",
      credit_category: result.type || "",
    });
    setStep("details");
  };

  // Go to manual entry
  const goManual = () => {
    setForm(prev => ({ ...prev, project_name: searchQuery }));
    setStep("details");
  };

  const searchCollaborators = async (query: string) => {
    if (query.length < 2) { setCollabResults([]); return; }
    setSearchingCollabs(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .ilike('full_name', `%${query}%`)
        .neq('user_id', userId)
        .limit(5);
      setCollabResults((data || []).filter(p => !selectedCollaborators.find(s => s.user_id === p.user_id)));
    } catch { /* ignore */ }
    setSearchingCollabs(false);
  };

  const handleSubmit = async () => {
    if (!form.project_name || !form.role) {
      toast.error("Project name and role are required");
      return;
    }

    setSaving(true);
    try {
      const year = form.start_date ? new Date(form.start_date).getFullYear() : new Date().getFullYear();
      const collaboratorIds = selectedCollaborators.map(c => c.user_id);

      const insertData: any = {
        user_id: userId,
        project_name: form.project_name,
        role: form.role,
        year,
        description: form.description || null,
        project_type: form.project_type || null,
        credit_category: form.project_type || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        location: form.location || null,
        platform: form.platform || null,
        url: form.url || null,
        client_brand: form.client_brand || null,
        collaborator_user_ids: collaboratorIds.length > 0 ? collaboratorIds : null,
      };

      const { data: insertedData, error } = await supabase
        .from("credits")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (insertedData) {
        supabase.functions.invoke('verify-credit', {
          body: {
            credit_id: insertedData.id,
            project_name: form.project_name,
            role: form.role,
            year,
            platform: form.platform,
          },
        }).catch(err => console.log('AI verification queued:', err));

        for (const collab of selectedCollaborators) {
          await supabase.from('credit_endorsements').insert({
            credit_id: insertedData.id,
            requested_by: userId,
            endorser_id: collab.user_id,
            endorser_name: collab.full_name,
            status: 'pending',
            relationship: 'collaborator',
          }).catch(err => console.log('Endorsement request error:', err));
        }
      }

      toast.success("Credit added — AI verification in progress");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding credit:", error);
      toast.error("Failed to add credit");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep("search");
    setSearchQuery("");
    setWebResults([]);
    setHasSearched(false);
    setForm({
      project_name: "", project_type: "", role: "", description: "",
      start_date: "", end_date: "", location: "", platform: "",
      url: "", client_brand: "", credit_category: "",
    });
    setSelectedCollaborators([]);
    setCollabSearch("");
    setCollabResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            {step === "search" ? (
              <>
                <Wand2 className="h-5 w-5 text-primary" />
                Claim Your Work
              </>
            ) : (
              "Credit Details"
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "search"
              ? "Search for your work across platforms — we'll auto-fill the details"
              : "Review and complete your credit details"
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          {step === "search" ? (
            <div className="space-y-4">
              {/* Unified AI Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                    placeholder="Search any project, song, film, event..."
                    className="pl-9 pr-20 h-11 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-xs gap-1"
                    onClick={handleAISearch}
                    disabled={searching || searchQuery.length < 2}
                  >
                    {searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Search
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Searches IMDb, Spotify, YouTube, Discogs, and more via AI
                </p>
              </div>

              {/* Results */}
              {searching && (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Searching platforms...</span>
                </div>
              )}

              {!searching && webResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {webResults.length} result{webResults.length !== 1 ? 's' : ''} found — tap to claim
                  </p>
                  {webResults.map((result, i) => (
                    <Card
                      key={i}
                      className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      onClick={() => claimResult(result)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{result.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                            {result.year && <span>{result.year}</span>}
                            {result.platform && (
                              <Badge variant="secondary" className="text-[9px] h-4">{result.platform}</Badge>
                            )}
                            {result.type && (
                              <Badge variant="outline" className="text-[9px] h-4 capitalize">{result.type.replace(/_/g, ' ')}</Badge>
                            )}
                          </div>
                          {result.description && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{result.description}</p>
                          )}
                          {result.role_suggestion && (
                            <p className="text-[11px] text-primary mt-0.5">Suggested role: {result.role_suggestion}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!searching && hasSearched && webResults.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-1">No results found</p>
                  <p className="text-xs text-muted-foreground">You can still add it manually</p>
                </div>
              )}

              {/* Manual entry option */}
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  className="w-full text-sm gap-2"
                  onClick={goManual}
                >
                  <Plus className="h-4 w-4" />
                  {searchQuery ? `Add "${searchQuery}" manually` : "Add credit manually"}
                </Button>
              </div>
            </div>
          ) : (
            /* DETAILS STEP */
            <div className="space-y-4">
              {/* Back button */}
              <Button variant="ghost" size="sm" className="h-7 text-xs -ml-2" onClick={() => setStep("search")}>
                ← Back to search
              </Button>

              {/* Row 1: Project Name + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Project Title *</Label>
                  <Input
                    value={form.project_name}
                    onChange={(e) => update("project_name", e.target.value)}
                    placeholder="e.g., Carnival 2025 Main Stage"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Project Type</Label>
                  <Select value={form.project_type} onValueChange={(v) => update("project_type", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(group => (
                        <SelectGroup key={group.value}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.items.map(item => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Your Role *</Label>
                <Input
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  placeholder="e.g., Stage Manager, Director, Lead Vocalist"
                  className="h-9 text-sm"
                />
              </div>

              {/* Row 3: Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Brief description of your contribution..."
                  className="min-h-[60px] text-sm resize-none"
                  maxLength={500}
                />
              </div>

              {/* Row 4: Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Start Date
                  </Label>
                  <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> End Date
                  </Label>
                  <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              {/* Row 5: Location + Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </Label>
                  <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g., Port of Spain, Trinidad" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Venue / Platform</Label>
                  <Input value={form.platform} onChange={(e) => update("platform", e.target.value)} placeholder="e.g., Queen's Hall, Netflix" className="h-9 text-sm" />
                </div>
              </div>

              {/* Row 6: Client + URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Client / Brand
                  </Label>
                  <Input value={form.client_brand} onChange={(e) => update("client_brand", e.target.value)} placeholder="e.g., Coca-Cola, NBC" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> External Link
                  </Label>
                  <Input value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://..." className="h-9 text-sm" />
                </div>
              </div>

              {/* Collaborators */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Users className="h-3 w-3" /> Tag Collaborators
                </Label>
                
                {selectedCollaborators.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCollaborators.map(c => (
                      <Badge key={c.user_id} variant="secondary" className="gap-1 pr-1 text-xs">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={c.avatar_url || ''} />
                          <AvatarFallback className="text-[8px]">{c.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        {c.full_name?.split(' ')[0]}
                        <button
                          onClick={() => setSelectedCollaborators(prev => prev.filter(s => s.user_id !== c.user_id))}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={collabSearch}
                    onChange={(e) => {
                      setCollabSearch(e.target.value);
                      searchCollaborators(e.target.value);
                    }}
                    placeholder="Search by name..."
                    className="h-9 text-sm pl-8"
                  />
                  {searchingCollabs && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin" />}
                </div>

                {collabResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                    {collabResults.map(p => (
                      <button
                        key={p.user_id}
                        className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedCollaborators(prev => [...prev, p]);
                          setCollabResults(prev => prev.filter(r => r.user_id !== p.user_id));
                          setCollabSearch("");
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={p.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">{p.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.full_name}</p>
                          {p.role && <p className="text-[10px] text-muted-foreground truncate">{p.role}</p>}
                        </div>
                        <Plus className="h-3.5 w-3.5 ml-auto text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Tagged collaborators receive a verification request to confirm this credit
                </p>
              </div>

              {/* Submit */}
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Credit
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
