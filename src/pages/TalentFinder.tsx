import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition } from "@/components/PageTransition";
import { FreeTierGate } from "@/components/FreeTierGate";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, ArrowLeft, MapPin, Star, Loader2,
  Eye, UserPlus, MessageSquare, Zap, Send,
  FileText, CheckCircle2, RefreshCw, Crown, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TalentMatch {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url: string;
  location: string;
  level: number;
  xp: number;
  professional_skills: any[];
  match_score: number;
  match_reasons: string[];
  headline: string;
}

export default function TalentFinder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [brief, setBrief] = useState("");
  const [matches, setMatches] = useState<TalentMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({});

  const handleFindTalent = async () => {
    if (!brief.trim() || brief.trim().length < 10) {
      toast({ title: "Tell us more", description: "Describe what you need in at least a sentence or two.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-talent-match", {
        body: { brief_text: brief, limit: 10 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMatches(data?.suggestions || []);
      if (data?.suggestions?.length > 0) {
        toast({ title: `${data.suggestions.length} matches found ✨`, description: "AI-ranked by relevance to your brief" });
      } else {
        toast({ title: "No matches yet", description: "Try broadening your brief or check back as more creators join." });
      }
    } catch (err: any) {
      console.error("Talent match error:", err);
      toast({ title: "Matching failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async (talent: TalentMatch) => {
    if (!user) return;
    try {
      await supabase.from("talent_shortlist").upsert({
        company_user_id: user.id,
        talent_user_id: talent.user_id,
        match_score: talent.match_score,
        match_reasons: talent.match_reasons,
        status: "shortlisted",
      }, { onConflict: "company_user_id,talent_user_id,opportunity_id" });
      setShortlisted(prev => ({ ...prev, [talent.user_id]: true }));
      toast({ title: `${talent.full_name} shortlisted!` });
    } catch {
      toast({ title: "Failed to shortlist", variant: "destructive" });
    }
  };

  const handlePostAsGig = () => {
    // Navigate to opportunity creation with the brief pre-filled
    navigate("/post-opportunity", { state: { prefillBrief: brief } });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (score >= 70) return "text-primary bg-primary/10 border-primary/20";
    return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    return "Good";
  };

  return (
    <PageTransition>
      <Helmet>
        <title>AI Talent Finder | ThriveIN</title>
        <meta name="description" content="Describe your project and let AI find the best creative talent for you." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Talent Finder
            </h1>
            <p className="text-xs text-muted-foreground">Describe your project — paid or barter — AI finds the best creators</p>
          </div>
          <Badge variant="secondary" className="gap-1 text-xs shrink-0">
            <Crown className="h-3 w-3 text-primary" /> Pro
          </Badge>
        </div>

        <FreeTierGate
          feature="aiApplicantRankings"
          featureLabel="AI Talent Finder"
          description="Upgrade to Pro to unlock AI-powered talent matching — describe your project and get instant ranked recommendations."
        >
          {/* Brief Input */}
          {!hasSearched || matches.length === 0 ? (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    What do you need?
                  </label>
                  <Textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value)}
                    placeholder={`e.g. "I need a video editor for a music video, budget $500, 2-week turnaround" or "Looking for a content creator to feature our villa — free 2-night stay in exchange for 1 Reel + 3 Stories"`}
                    rows={4}
                    maxLength={800}
                    disabled={loading}
                    className="bg-background resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{brief.length}/800</p>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>Include role, skills, budget, timeline, and location preferences for better matches</span>
                </div>

                <Button
                  onClick={handleFindTalent}
                  disabled={loading || brief.trim().length < 10}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding top matches...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Find My Top Matches
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            /* Brief summary bar when results are showing */
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Your brief:</p>
                  <p className="text-sm line-clamp-2">{brief}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => { setHasSearched(false); setMatches([]); }}
                  >
                    <RefreshCw className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={handlePostAsGig}
                  >
                    <Send className="h-3 w-3" /> Post as Gig
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-3 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <div>
                  <p className="font-medium text-sm">Analyzing your brief...</p>
                  <p className="text-xs text-muted-foreground">Scoring creators by skills, experience & fit</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && hasSearched && matches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {matches.length} match{matches.length !== 1 ? "es" : ""} found
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleFindTalent}
                  disabled={loading}
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
              </div>

              {matches.map((talent, idx) => (
                <Card
                  key={talent.user_id}
                  className="p-3 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/profile/${talent.user_id}`)}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full border text-xs font-bold",
                        getScoreColor(talent.match_score)
                      )}>
                        {talent.match_score}%
                      </div>
                      <span className="text-[9px] text-muted-foreground">{getScoreLabel(talent.match_score)}</span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={talent.avatar_url} />
                      <AvatarFallback>{talent.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{talent.full_name}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      </div>
                      {talent.role && (
                        <p className="text-xs text-muted-foreground truncate">{talent.role}</p>
                      )}

                      {/* AI headline */}
                      <p className="text-xs text-primary/80 mt-1 italic line-clamp-1">"{talent.headline}"</p>

                      {/* Match reasons */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {talent.match_reasons.slice(0, 2).map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {reason}
                          </Badge>
                        ))}
                      </div>

                      {talent.location && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1">
                          <MapPin className="h-2.5 w-2.5" /> {talent.location}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={e => { e.stopPropagation(); navigate(`/profile/${talent.user_id}`); }}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        {shortlisted[talent.user_id] ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={e => { e.stopPropagation(); navigate(`/messages?to=${talent.user_id}`); }}
                          >
                            <MessageSquare className="h-3 w-3" /> Message
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1"
                            onClick={e => { e.stopPropagation(); handleShortlist(talent); }}
                          >
                            <UserPlus className="h-3 w-3" /> Shortlist
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Post as Gig CTA */}
              <Card className="p-4 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Want more applicants?</p>
                    <p className="text-xs text-muted-foreground">Turn your brief into a public gig post and let creators come to you.</p>
                  </div>
                  <Button size="sm" variant="default" className="gap-1 shrink-0" onClick={handlePostAsGig}>
                    <Send className="h-3 w-3" /> Post
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* No results */}
          {!loading && hasSearched && matches.length === 0 && (
            <div className="text-center py-10">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-medium text-sm mb-1">No matches found</p>
              <p className="text-xs text-muted-foreground mb-4">Try broadening your brief or adjusting the requirements.</p>
              <div className="flex flex-col gap-2 items-center">
                <Button variant="outline" size="sm" onClick={() => { setHasSearched(false); }}>
                  Edit Brief
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handlePostAsGig}>
                  <Send className="h-3 w-3" /> Post as a Gig instead
                </Button>
              </div>
            </div>
          )}
        </FreeTierGate>
      </div>
    </PageTransition>
  );
}
