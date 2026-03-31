import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ArrowLeft, Trophy, Clock, Users, Flame, Zap, Crown, Star, 
  Upload, Heart, Camera, ChevronUp, Award, Medal, Shield, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// GuruShots-inspired ranking tiers
const RANKING_TIERS = [
  { name: "Popular", min: 0, color: "text-green-500", bg: "bg-green-500/10", icon: Star },
  { name: "Skilled", min: 5, color: "text-blue-500", bg: "bg-blue-500/10", icon: Target },
  { name: "Premier", min: 15, color: "text-purple-500", bg: "bg-purple-500/10", icon: Medal },
  { name: "Elite", min: 30, color: "text-amber-500", bg: "bg-amber-500/10", icon: Award },
  { name: "All-Star", min: 50, color: "text-red-500", bg: "bg-red-500/10", icon: Crown },
];

function getRankingTier(votes: number) {
  for (let i = RANKING_TIERS.length - 1; i >= 0; i--) {
    if (votes >= RANKING_TIERS[i].min) return RANKING_TIERS[i];
  }
  return RANKING_TIERS[0];
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return { timeLeft, isExpired };
}

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDescription, setSubmitDescription] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitPreview, setSubmitPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch challenge
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { timeLeft, isExpired } = useCountdown(challenge?.ends_at || new Date().toISOString());

  // Fetch entries with profile info
  const { data: entries } = useQuery({
    queryKey: ["challenge-entries", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("challenge_id", id!)
        .order("vote_count", { ascending: false });
      if (error) throw error;

      // Fetch profiles for entries
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, creative_role")
          .in("user_id", userIds);
        
        return data.map(entry => ({
          ...entry,
          profile: profiles?.find(p => p.user_id === entry.user_id),
        }));
      }
      return data || [];
    },
    enabled: !!id,
    refetchInterval: 15000, // Live updates every 15s
  });

  // Check if user already voted
  const { data: myVotes } = useQuery({
    queryKey: ["my-votes", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_votes")
        .select("entry_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data?.map(v => v.entry_id) || []);
    },
    enabled: !!user,
  });

  // Check if user already submitted
  const myEntry = entries?.find((e: any) => e.user_id === user?.id);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // Insert vote
      const { error: voteError } = await supabase
        .from("challenge_votes")
        .insert({ entry_id: entryId, user_id: user!.id });
      if (voteError) throw voteError;

      // Increment vote count
      const entry = entries?.find((e: any) => e.id === entryId);
      if (entry) {
        await supabase
          .from("challenge_entries")
          .update({ vote_count: (entry.vote_count || 0) + 1 })
          .eq("id", entryId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", id] });
      queryClient.invalidateQueries({ queryKey: ["my-votes", id] });
      toast.success("Vote cast! 🔥");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Already voted for this entry");
      } else {
        toast.error("Failed to vote");
      }
    },
  });

  // Submit entry mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl = null;
      let mediaType = null;

      if (submitFile) {
        const ext = submitFile.name.split(".").pop();
        const path = `challenges/${id}/${user!.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, submitFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        mediaType = submitFile.type.startsWith("video") ? "video" : "image";
      }

      const { error } = await supabase.from("challenge_entries").insert({
        challenge_id: id!,
        user_id: user!.id,
        title: submitTitle || null,
        description: submitDescription || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (error) throw error;

      // Update entry count
      await supabase
        .from("challenges")
        .update({ entry_count: (challenge?.entry_count || 0) + 1 })
        .eq("id", id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", id] });
      queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      setShowSubmit(false);
      setSubmitTitle("");
      setSubmitDescription("");
      setSubmitFile(null);
      setSubmitPreview(null);
      toast.success("Entry submitted! Good luck! 🎨");
    },
    onError: () => toast.error("Failed to submit entry"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmitFile(file);
      const reader = new FileReader();
      reader.onload = () => setSubmitPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-lg px-4">
          <div className="h-48 rounded-xl bg-muted" />
          <div className="h-6 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Challenge not found</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/challenges")}>
            Back to Arena
          </Button>
        </div>
      </div>
    );
  }

  const isActive = challenge.status === "active" && !isExpired;
  const cadenceColors: Record<string, string> = {
    daily: "from-orange-500 to-amber-500",
    "48hr": "from-blue-500 to-cyan-500",
    weekly: "from-purple-500 to-pink-500",
    special: "from-amber-500 to-yellow-500",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>{challenge.title} | Cre8 Arena</title>
      </Helmet>

      {/* Hero */}
      <div className="relative">
        <div className={cn(
          "h-44 bg-gradient-to-br",
          cadenceColors[challenge.cadence] || "from-primary to-primary/70"
        )}>
          {challenge.cover_image_url && (
            <img 
              src={challenge.cover_image_url} 
              alt={challenge.title}
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Back button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-full h-9 w-9"
          onClick={() => navigate("/challenges")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Live countdown */}
        <div className="absolute top-3 right-3">
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1.5",
            isActive 
              ? "bg-background/80 text-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            <Clock className="h-3.5 w-3.5" />
            {isActive ? timeLeft : "Completed"}
          </div>
        </div>

        {/* Challenge info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-background/80 backdrop-blur-sm text-foreground border-0 text-[10px] font-semibold">
              {challenge.cadence.toUpperCase()}
            </Badge>
            <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] font-semibold">
              +{challenge.xp_reward} XP
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-background/60 backdrop-blur-sm border-0">
              {challenge.category}
            </Badge>
          </div>
          <h1 className="text-xl font-bold">{challenge.title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {/* Description */}
        {challenge.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{entries?.length || 0}</span>
            <span className="text-muted-foreground text-xs">entries</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{entries?.reduce((sum: number, e: any) => sum + (e.vote_count || 0), 0) || 0}</span>
            <span className="text-muted-foreground text-xs">votes</span>
          </div>
          {myEntry && (
            <div className="flex items-center gap-1.5 text-sm ml-auto">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-primary font-semibold text-xs">You're in!</span>
            </div>
          )}
        </div>

        {/* Submit CTA */}
        {isActive && !myEntry && user && (
          <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80">
                <Upload className="h-4 w-4" />
                Submit Your Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Submit Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Upload area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-colors",
                    submitPreview ? "border-primary/50" : "border-muted-foreground/20 hover:border-primary/30"
                  )}
                >
                  {submitPreview ? (
                    <img src={submitPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Tap to upload</p>
                      <p className="text-[10px] text-muted-foreground/60">Image or video</p>
                    </>
                  )}
                </div>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*,video/*" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
                <Input 
                  placeholder="Title (optional)" 
                  value={submitTitle} 
                  onChange={e => setSubmitTitle(e.target.value)} 
                />
                <Textarea 
                  placeholder="Tell us about your entry..." 
                  value={submitDescription} 
                  onChange={e => setSubmitDescription(e.target.value)}
                  rows={2}
                />
                <Button 
                  className="w-full" 
                  disabled={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Entry 🚀"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Ranking tiers legend */}
        {entries && entries.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {RANKING_TIERS.map(tier => {
              const TierIcon = tier.icon;
              const count = entries.filter((e: any) => getRankingTier(e.vote_count || 0).name === tier.name).length;
              return (
                <div key={tier.name} className={cn(
                  "shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
                  tier.bg, tier.color
                )}>
                  <TierIcon className="h-3 w-3" />
                  {tier.name}
                  {count > 0 && <span className="opacity-60">({count})</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Entry Gallery - GuruShots style grid */}
        {entries && entries.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {entries.map((entry: any, idx: number) => {
              const tier = getRankingTier(entry.vote_count || 0);
              const TierIcon = tier.icon;
              const hasVoted = myVotes?.has(entry.id);
              const isMyEntry = entry.user_id === user?.id;

              return (
                <Card 
                  key={entry.id} 
                  className={cn(
                    "overflow-hidden group relative transition-all",
                    idx === 0 && "col-span-2", // Featured top entry
                    isMyEntry && "ring-1 ring-primary/30"
                  )}
                >
                  {/* Media */}
                  <div className={cn("relative bg-muted", idx === 0 ? "h-52" : "h-36")}>
                    {entry.media_url ? (
                      entry.media_type === "video" ? (
                        <video 
                          src={entry.media_url} 
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                        />
                      ) : (
                        <img 
                          src={entry.media_url} 
                          alt={entry.title || "Entry"} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Camera className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Rank badge */}
                    <div className="absolute top-2 left-2">
                      <div className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm",
                        tier.bg, tier.color
                      )}>
                        <TierIcon className="h-3 w-3" />
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Vote button overlay */}
                    {!isMyEntry && user && isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!hasVoted) voteMutation.mutate(entry.id); }}
                        disabled={hasVoted || voteMutation.isPending}
                        className={cn(
                          "absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all backdrop-blur-sm",
                          hasVoted 
                            ? "bg-primary/90 text-primary-foreground" 
                            : "bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground active:scale-95"
                        )}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                        {entry.vote_count || 0}
                      </button>
                    )}

                    {/* If completed, show vote count without interaction */}
                    {(!isActive || isMyEntry || !user) && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-background/70 backdrop-blur-sm text-foreground">
                        <Heart className="h-3 w-3" />
                        {entry.vote_count || 0}
                      </div>
                    )}
                  </div>

                  {/* Entry info */}
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {entry.profile?.avatar_url ? (
                          <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {(entry.profile?.full_name || "?")[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium line-clamp-1">
                          {entry.title || entry.profile?.full_name || "Creator"}
                        </p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          @{entry.profile?.username || "user"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-primary/40" />
              </div>
              <p className="font-medium text-sm">No entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to submit!</p>
            </CardContent>
          </Card>
        )}

        {/* Winner section for completed challenges */}
        {challenge.status === "completed" && entries && entries.length > 0 && (
          <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold mb-1">Winner</p>
              <div className="flex items-center gap-2 justify-center">
                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                  {(entries[0] as any)?.profile?.avatar_url ? (
                    <img src={(entries[0] as any).profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">?</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{(entries[0] as any)?.profile?.full_name || "Creator"}</p>
                  <p className="text-[10px] text-amber-600">{(entries[0] as any)?.vote_count || 0} votes • +{challenge.xp_reward} XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetail;
