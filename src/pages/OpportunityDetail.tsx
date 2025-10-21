import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, DollarSign, Clock, Briefcase, Share2, CheckCircle2, XCircle, UserPlus, ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import { ApplyToOpportunityDialog } from "@/components/ApplyToOpportunityDialog";

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

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied! 📋",
      description: "Share this opportunity with others",
    });
  };

  const handleApply = () => {
    if (!user) {
      // Redirect to auth page with current opportunity as redirect target
      navigate(`/auth?redirect=/opportunity/${id}`);
    } else {
      // User is authenticated, open apply dialog
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
          <p className="text-muted-foreground">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Opportunity Not Found</h2>
          <p className="text-muted-foreground mb-4">This opportunity may have been removed or doesn't exist.</p>
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
              {user ? "Apply for this Opportunity" : "Sign Up to Apply"}
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              Campaign Ended
            </Button>
          )}
          
          {!user && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Create a free account to apply for this opportunity
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
