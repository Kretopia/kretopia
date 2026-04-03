import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, DollarSign, Clock, Briefcase, Share2, CheckCircle2, XCircle, UserPlus, ArrowLeft, Bookmark, BookmarkCheck, Gift, ArrowRightLeft, ArrowRight, Instagram, Music, Youtube, Edit } from "lucide-react";
import { ApplyToOpportunityDialog } from "@/components/ApplyToOpportunityDialog";
import { EditOpportunityDialog } from "@/components/EditOpportunityDialog";
import { SEO } from "@/components/SEO";

interface Opportunity {
  id: string;
  title: string;
  type: string;
  description: string;
  compensation: string;
  location: string;
  requirements: string;
  skills: string[];
  deliverables: string;
  duration: string;
  tags: string[];
  status: string;
  image_url: string;
  created_at: string;
  barter_offering?: string | null;
  barter_requesting?: string | null;
  platform_requirements?: string[] | null;
  min_followers?: number | null;
  content_deliverables?: any;
}

const OpportunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching opportunity:', error);
      } else {
        setOpportunity(data);
      }
      setLoading(false);
      return;
    }

    const [oppResult, savedResult] = await Promise.all([
      supabase.from('opportunities').select('*').eq('id', id).maybeSingle(),
      supabase.from('saved_opportunities').select('id').eq('user_id', user.id).eq('opportunity_id', id).maybeSingle()
    ]);

    if (oppResult.error) {
      console.error('Error fetching opportunity:', oppResult.error);
    } else {
      setOpportunity(oppResult.data);
    }
    
    setIsSaved(!!savedResult.data);
    setLoading(false);
  };

  // Auto-open apply dialog after signup redirect
  useEffect(() => {
    if (!user || !id) return;
    const pendingApply = sessionStorage.getItem('pending_apply_opportunity');
    if (pendingApply === id) {
      sessionStorage.removeItem('pending_apply_opportunity');
      // Small delay to let opportunity data load first
      const timer = setTimeout(() => setShowApplyDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, id]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  // Track view (deduplicated per session)
  useEffect(() => {
    if (!id) return;
    const sessionKey = `opp_viewed_${id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    supabase
      .from("opportunity_views")
      .insert({ opportunity_id: id, viewer_id: user?.id ?? null })
      .then(({ error }) => {
        if (error) console.error("View tracking error:", error);
      });
  }, [id, user?.id]);

  const handleShare = async () => {
    const url = `https://www.thrivein.io/opportunity/${id}`;
    const shareText = `🔥 ${opportunity?.title} — ${opportunity?.type === 'barter' ? 'Barter exchange' : opportunity?.type} gig on ThriveIN!\n\nApply now 👇\n${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: opportunity?.title, text: shareText, url });
        return;
      } catch {}
    }
    
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Link Copied! 📋",
      description: "Share text copied — paste it anywhere!",
    });
  };

  const handleApply = () => {
    if (!user) {
      // Store intent to auto-apply after signup
      sessionStorage.setItem('pending_apply_opportunity', id!);
      navigate(`/auth?redirect=/opportunity/${id}`);
    } else {
      setShowApplyDialog(true);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate(`/auth?redirect=/opportunity/${id}`);
      return;
    }

    if (isSaved) {
      // Remove bookmark
      const { error } = await supabase
        .from('saved_opportunities')
        .delete()
        .eq('user_id', user.id)
        .eq('opportunity_id', id);
      
      if (!error) {
        setIsSaved(false);
        toast({
          title: "Removed from saved",
          description: "Opportunity removed from your bookmarks",
        });
      }
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('saved_opportunities')
        .insert({
          user_id: user.id,
          opportunity_id: id,
        });
      
      if (!error) {
        setIsSaved(true);
        toast({
          title: "Saved! 🔖",
          description: "Opportunity added to your bookmarks",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Briefcase className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading gig details...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Gig Not Found</h2>
          <p className="text-muted-foreground mb-4">This gig may have been removed or doesn't exist.</p>
          <Link to="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = opportunity.status === 'active';

  return (
    <div className="min-h-screen p-4 md:p-6">
      <SEO
        title={`${opportunity.title} — Gig on ThriveIN`}
        description={opportunity.description?.slice(0, 155) || `${opportunity.type} gig: ${opportunity.title}`}
        type="article"
        image={opportunity.image_url || undefined}
        url={`https://www.thrivein.io/opportunity/${opportunity.id}`}
      />
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleBookmark}>
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        {!isActive && (
          <div className="mb-4 rounded-lg bg-muted p-4 text-center">
            <Badge variant="secondary">Campaign Ended</Badge>
          </div>
        )}

        {/* Image */}
        {opportunity.image_url && (
          <div className="mb-6 aspect-video w-full overflow-hidden rounded-2xl border">
            <img
              src={opportunity.image_url}
              alt={opportunity.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Content Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          {/* Title and Type */}
          <div className="mb-4">
            <Badge className="mb-2">
              {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}
            </Badge>
            <h1 className="text-3xl font-bold">{opportunity.title}</h1>
          </div>

          {/* Meta Info */}
          <div className="mb-6 flex flex-wrap gap-4 text-sm">
            {opportunity.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {opportunity.location}
              </div>
            )}
            {opportunity.compensation && (
              <div className="flex items-center gap-2 text-accent">
                <DollarSign className="h-4 w-4" />
                {opportunity.compensation}
              </div>
            )}
            {opportunity.duration && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {opportunity.duration}
              </div>
            )}
          </div>

          {/* Tags */}
          {opportunity.tags && opportunity.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {opportunity.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Barter Exchange Section */}
          {opportunity.type === 'barter' && (opportunity.barter_offering || opportunity.barter_requesting) && (
            <div className="mb-6 rounded-xl border-2 border-dashed border-purple-300 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-indigo-800 dark:text-purple-300">The Exchange</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {opportunity.barter_offering && (
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-indigo-700 dark:text-purple-300 uppercase tracking-wide">What You Get</span>
                    </div>
                    <p className="text-sm font-medium">{opportunity.barter_offering}</p>
                  </div>
                )}
                {opportunity.barter_requesting && (
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-indigo-700 dark:text-purple-300 uppercase tracking-wide">What They Need</span>
                    </div>
                    <p className="text-sm font-medium">{opportunity.barter_requesting}</p>
                  </div>
                )}
              </div>
              {/* Platform requirements */}
              {opportunity.platform_requirements && opportunity.platform_requirements.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Platforms:</span>
                  <div className="flex gap-1.5">
                    {opportunity.platform_requirements.map(p => (
                      <Badge key={p} variant="outline" className="text-[11px] capitalize gap-1">
                        {p === 'instagram' && <Instagram className="h-3 w-3" />}
                        {p === 'tiktok' && <Music className="h-3 w-3" />}
                        {p === 'youtube' && <Youtube className="h-3 w-3" />}
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {opportunity.min_followers && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Min. {opportunity.min_followers >= 1000 ? `${(opportunity.min_followers / 1000).toFixed(0)}k` : opportunity.min_followers}+ followers required
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Description</h2>
            <p className="whitespace-pre-line text-muted-foreground">{opportunity.description}</p>
          </div>

          {/* Requirements */}
          {opportunity.requirements && (
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Requirements</h2>
              <p className="whitespace-pre-line text-muted-foreground">{opportunity.requirements}</p>
            </div>
          )}

          {/* Skills */}
          {opportunity.skills && opportunity.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Skills Needed</h2>
              <div className="flex flex-wrap gap-2">
                {opportunity.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {opportunity.deliverables && (
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Deliverables</h2>
              <p className="whitespace-pre-line text-muted-foreground">{opportunity.deliverables}</p>
            </div>
          )}

          {/* Apply Button */}
          {isActive ? (
            <Button size="lg" className="w-full" onClick={handleApply}>
              {!user && <UserPlus className="mr-2 h-5 w-5" />}
              {user ? "Apply Now" : "Sign Up to Apply"}
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              Campaign Ended
            </Button>
          )}
          
          {!user && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Create a free account to apply for this gig
            </p>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      {opportunity && (
        <ApplyToOpportunityDialog 
          open={showApplyDialog}
          onOpenChange={setShowApplyDialog}
          opportunityId={opportunity.id}
          opportunityTitle={opportunity.title}
          opportunityDescription={opportunity.description}
        />
      )}
    </div>
  );
};

export default OpportunityDetail;
