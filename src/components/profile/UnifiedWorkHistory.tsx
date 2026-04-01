import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { 
  Film, 
  Tv, 
  Music, 
  Disc3, 
  Video, 
  ExternalLink, 
  CheckCircle2,
  Plus,
  Loader2,
  ShieldCheck,
  Trash2,
  Mic2,
  Play,
  Eye,
  Drama,
  PersonStanding,
  CalendarDays,
  Sparkles,
  Crown,
  Shirt,
  Megaphone,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaPlayerModal } from "./MediaPlayerModal";
import { parseMediaUrl } from "@/lib/mediaUtils";
import { CreditEndorsementDialog } from "./CreditEndorsementDialog";

interface ManualCredit {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  platform?: string;
  url?: string;
  thumbnail_url?: string;
  verification_status?: string;
  is_featured?: boolean;
  source: 'manual';
}

interface VerifiedCredit {
  id: string;
  source: string;
  source_id: string;
  credit_type: string;
  title: string;
  role: string;
  year: number | null;
  metadata: any;
  verification_url: string;
  verified_at: string;
}

interface UnifiedCredit {
  id: string;
  title: string;
  role: string;
  year: number | null;
  platform?: string;
  url?: string;
  thumbnailUrl?: string;
  isVerified: boolean;
  source?: string;
  creditType?: string;
}

interface UnifiedWorkHistoryProps {
  userId: string;
  isOwnProfile: boolean;
  onRefresh?: () => void;
}

const CREDIT_TYPE_ICONS: Record<string, any> = {
  film: Film,
  movie: Film,
  tv: Tv,
  album: Disc3,
  single: Music,
  music_video: Video,
  podcast: Mic2,
  episode: Mic2,
  video: Video,
  // Performing Arts
  theatre: Drama,
  theater: Drama,
  stage: Drama,
  play: Drama,
  musical: Drama,
  pantomime: Drama,
  spoken_word: Mic2,
  comedy: Drama,
  dance: PersonStanding,
  recital: PersonStanding,
  // Live Events & Festivals
  live_event: CalendarDays,
  concert: Music,
  festival: CalendarDays,
  carnival: Sparkles,
  pageant: Crown,
  fashion_show: Shirt,
  // Commercial & Corporate
  commercial: Megaphone,
  ad: Megaphone,
  corporate: Briefcase,
  hosting: Mic2,
  mc: Mic2,
  brand_campaign: Megaphone,
  voiceover: Mic2,
  // General
  credit: Film,
};

const SOURCE_COLORS: Record<string, string> = {
  spotify: 'bg-green-500/20 text-green-600 dark:text-green-400',
  youtube: 'bg-red-500/20 text-red-600 dark:text-red-400',
  tmdb: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  imdb: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  discogs: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  musicbrainz: 'bg-primary/20 text-indigo-700 dark:text-primary',
  project: 'bg-primary/10 text-primary',
  manual: 'bg-muted text-muted-foreground',
};

export function UnifiedWorkHistory({ userId, isOwnProfile, onRefresh }: UnifiedWorkHistoryProps) {
  const [credits, setCredits] = useState<UnifiedCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [selectedCredit, setSelectedCredit] = useState<UnifiedCredit | null>(null);
  const [endorsementCredit, setEndorsementCredit] = useState<{id: string; project_name: string; role: string; year?: number} | null>(null);
  const INITIAL_ITEMS_PER_SOURCE = 3;
  const [newCredit, setNewCredit] = useState({
    project_name: "",
    role: "",
    year: new Date().getFullYear(),
    platform: "",
    url: "",
  });

  useEffect(() => {
    fetchAllCredits();
  }, [userId]);

  const fetchAllCredits = async () => {
    try {
      // Fetch both manual and verified credits in parallel
      const [manualRes, verifiedRes] = await Promise.all([
        supabase
          .from('credits')
          .select('*')
          .eq('user_id', userId)
          .order('year', { ascending: false }),
        supabase
          .from('verified_credits')
          .select('*')
          .eq('user_id', userId)
          .order('year', { ascending: false, nullsFirst: false })
      ]);

      const manualCredits: UnifiedCredit[] = (manualRes.data || []).map((c: any) => ({
        id: c.id,
        title: c.project_name,
        role: c.role,
        year: c.year,
        platform: c.platform,
        url: c.url,
        thumbnailUrl: c.thumbnail_url,
        isVerified: c.verification_status === 'verified',
        source: c.verification_status === 'verified' ? 'project' : 'manual',
        creditType: 'credit'
      }));

      const verifiedCredits: UnifiedCredit[] = (verifiedRes.data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        role: c.role,
        year: c.year,
        platform: c.source,
        url: c.verification_url,
        thumbnailUrl: c.metadata?.posterUrl || c.metadata?.imageUrl || c.metadata?.thumbUrl,
        isVerified: true,
        source: c.source,
        creditType: c.credit_type
      }));

      // Combine and sort by year (descending)
      const allCredits = [...verifiedCredits, ...manualCredits].sort((a, b) => {
        if (!a.year && !b.year) return 0;
        if (!a.year) return 1;
        if (!b.year) return -1;
        return b.year - a.year;
      });

      setCredits(allCredits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const addManualCredit = async () => {
    if (!newCredit.project_name || !newCredit.role) {
      toast.error("Please fill in project name and role");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: insertedData, error } = await supabase.from("credits").insert({
        user_id: user.id,
        project_name: newCredit.project_name,
        role: newCredit.role,
        year: newCredit.year,
        platform: newCredit.platform || null,
        url: newCredit.url || null,
      }).select().single();

      if (error) throw error;

      // Trigger AI verification in background
      if (insertedData) {
        supabase.functions.invoke('verify-credit', {
          body: {
            credit_id: insertedData.id,
            project_name: newCredit.project_name,
            role: newCredit.role,
            year: newCredit.year,
            platform: newCredit.platform,
          },
        }).catch(err => console.log('AI verification queued:', err));
      }

      toast.success("Credit added successfully");
      setNewCredit({
        project_name: "",
        role: "",
        year: new Date().getFullYear(),
        platform: "",
        url: "",
      });
      setIsAddDialogOpen(false);
      fetchAllCredits();
      onRefresh?.();
    } catch (error) {
      console.error("Error adding credit:", error);
      toast.error("Failed to add credit");
    }
  };

  const handleDelete = async (id: string, isVerified: boolean) => {
    setDeletingId(id);
    try {
      const table = isVerified ? 'verified_credits' : 'credits';
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;

      setCredits(prev => prev.filter(c => c.id !== id));
      toast.success("Credit removed");
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting credit:", error);
      toast.error("Failed to remove credit");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const verifiedCount = credits.filter(c => c.isVerified).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Work History</h3>
          {verifiedCount > 0 && (
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" />
              {verifiedCount} verified
            </Badge>
          )}
        </div>
        {isOwnProfile && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Credit Manually</DialogTitle>
                <DialogDescription>
                  For faster import, connect your platforms above to auto-import your work history.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project Name *</Label>
                    <Input
                      id="project"
                      value={newCredit.project_name}
                      onChange={(e) => setNewCredit({ ...newCredit, project_name: e.target.value })}
                      placeholder="e.g., The Matrix"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Your Role *</Label>
                    <Input
                      id="role"
                      value={newCredit.role}
                      onChange={(e) => setNewCredit({ ...newCredit, role: e.target.value })}
                      placeholder="e.g., Director"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newCredit.year}
                      onChange={(e) => setNewCredit({ ...newCredit, year: parseInt(e.target.value) })}
                      placeholder="2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      value={newCredit.platform}
                      onChange={(e) => setNewCredit({ ...newCredit, platform: e.target.value })}
                      placeholder="e.g., Netflix"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="url">URL (optional)</Label>
                    <Input
                      id="url"
                      value={newCredit.url}
                      onChange={(e) => setNewCredit({ ...newCredit, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <Button onClick={addManualCredit} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {credits.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No work history yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwnProfile 
              ? "Connect your platforms to auto-import, or add credits manually" 
              : "No credits to display"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group credits by source */}
          {(() => {
            const groupedCredits = credits.reduce((acc, credit) => {
              const source = credit.source || 'manual';
              if (!acc[source]) acc[source] = [];
              acc[source].push(credit);
              return acc;
            }, {} as Record<string, UnifiedCredit[]>);

            const sourceOrder = ['project', 'tmdb', 'imdb', 'spotify', 'youtube', 'musicbrainz', 'discogs', 'manual'];
            const sortedSources = Object.keys(groupedCredits).sort((a, b) => {
              const aIndex = sourceOrder.indexOf(a);
              const bIndex = sourceOrder.indexOf(b);
              return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
            });

            return sortedSources.map(source => {
              const sourceCredits = groupedCredits[source];
              const isExpanded = expandedSources.has(source);
              const displayCredits = isExpanded ? sourceCredits : sourceCredits.slice(0, INITIAL_ITEMS_PER_SOURCE);
              const hasMore = sourceCredits.length > INITIAL_ITEMS_PER_SOURCE;
              const sourceColor = SOURCE_COLORS[source] || SOURCE_COLORS.manual;
              const sourceName = source === 'tmdb' ? 'IMDB/TMDB' : source === 'project' ? 'Project Credits' : source.charAt(0).toUpperCase() + source.slice(1);

              return (
                <div key={source} className="space-y-2">
                  {/* Source header with count */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("text-xs gap-1", sourceColor)}>
                      <CheckCircle2 className="h-3 w-3" />
                      {sourceName} • {sourceCredits.length} credit{sourceCredits.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Credits for this source */}
                  {displayCredits.map((credit) => {
                    const Icon = CREDIT_TYPE_ICONS[credit.creditType || 'credit'] || Film;
                    const mediaInfo = credit.url ? parseMediaUrl(credit.url) : null;
                    const isPlayable = mediaInfo && ['youtube', 'vimeo', 'spotify', 'soundcloud'].includes(mediaInfo.platform);

                    return (
                      <div
                        key={credit.id}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg transition-colors group",
                          credit.isVerified 
                            ? "bg-green-500/5 border border-green-500/20 hover:bg-green-500/10" 
                            : "bg-muted/30 hover:bg-muted/50",
                          isPlayable && "cursor-pointer"
                        )}
                        onClick={() => isPlayable && setSelectedCredit(credit)}
                      >
                        <div className="relative shrink-0">
                          {credit.thumbnailUrl ? (
                            <img
                              src={credit.thumbnailUrl}
                              alt={credit.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Icon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Play overlay for playable content */}
                          {isPlayable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <Play className="h-5 w-5 text-white" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{credit.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {credit.role}
                            {credit.year && <span className="ml-2">• {credit.year}</span>}
                            {credit.platform && !credit.isVerified && (
                              <span className="ml-2">• {credit.platform}</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {credit.url && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPlayable) {
                                  setSelectedCredit(credit);
                                } else {
                                  window.open(credit.url, '_blank');
                                }
                              }}
                            >
                              {isPlayable ? (
                                <Play className="h-4 w-4" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isOwnProfile && !credit.isVerified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEndorsementCredit({
                                  id: credit.id,
                                  project_name: credit.title,
                                  role: credit.role,
                                  year: credit.year || undefined,
                                });
                              }}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              title="Request endorsement"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwnProfile && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(credit.id, credit.isVerified);
                              }}
                              disabled={deletingId === credit.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deletingId === credit.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Show more/less button */}
                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setExpandedSources(prev => {
                          const next = new Set(prev);
                          if (next.has(source)) {
                            next.delete(source);
                          } else {
                            next.add(source);
                          }
                          return next;
                        });
                      }}
                    >
                      {isExpanded 
                        ? `Show less` 
                        : `Show ${sourceCredits.length - INITIAL_ITEMS_PER_SOURCE} more`
                      }
                    </Button>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Media Player Modal for in-app preview */}
      <MediaPlayerModal
        isOpen={!!selectedCredit}
        onClose={() => setSelectedCredit(null)}
        item={selectedCredit ? {
          title: selectedCredit.title,
          description: `${selectedCredit.role}${selectedCredit.year ? ` • ${selectedCredit.year}` : ''}`,
          media_type: selectedCredit.creditType === 'album' || selectedCredit.creditType === 'single' ? 'audio' : 'video',
          media_url: selectedCredit.url || '',
          thumbnail_url: selectedCredit.thumbnailUrl,
        } : null}
      />

      {/* Endorsement Dialog */}
      {endorsementCredit && (
        <CreditEndorsementDialog
          open={!!endorsementCredit}
          onOpenChange={(open) => !open && setEndorsementCredit(null)}
          credit={endorsementCredit}
          userId={userId}
        />
      )}
    </div>
  );
}
