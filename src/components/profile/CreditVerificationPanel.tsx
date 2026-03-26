import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Check, X, MessageSquare, Loader2, Clock } from "lucide-react";

interface PendingEndorsement {
  id: string;
  credit_id: string;
  requested_by: string;
  relationship: string | null;
  requested_at: string;
  credits: {
    project_name: string;
    role: string;
    year: number | null;
  };
  requester_profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CreditVerificationPanelProps {
  userId: string;
}

export function CreditVerificationPanel({ userId }: CreditVerificationPanelProps) {
  const [pendingEndorsements, setPendingEndorsements] = useState<PendingEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingEndorsements();
  }, [userId]);

  const fetchPendingEndorsements = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_endorsements')
        .select(`
          id, credit_id, requested_by, relationship, requested_at,
          credits!credit_endorsements_credit_id_fkey(project_name, role, year)
        `)
        .eq('endorser_id', userId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch requester profiles
      const enriched = await Promise.all(
        (data || []).map(async (endorsement: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', endorsement.requested_by)
            .single();
          return { ...endorsement, requester_profile: profile };
        })
      );

      setPendingEndorsements(enriched as any[]);
    } catch (error) {
      console.error('Error fetching endorsements:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToEndorsement = async (endorsementId: string, accept: boolean) => {
    setRespondingId(endorsementId);
    try {
      const testimonial = testimonials[endorsementId] || null;

      const { error } = await supabase
        .from('credit_endorsements')
        .update({
          status: accept ? 'accepted' : 'declined',
          testimonial: accept ? testimonial : null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', endorsementId)
        .eq('endorser_id', userId);

      if (error) throw error;

      if (accept) {
        // Increment endorsement count on the credit
        const endorsement = pendingEndorsements.find(e => e.id === endorsementId);
        if (endorsement) {
          await supabase.rpc('increment_endorsement_count' as any, { credit_id_param: endorsement.credit_id });
        }
      }

      setPendingEndorsements(prev => prev.filter(e => e.id !== endorsementId));
      toast.success(accept ? 'Credit endorsed! Your verification has been added.' : 'Endorsement declined.');
    } catch (error: any) {
      console.error('Error responding to endorsement:', error);
      toast.error('Failed to respond');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (pendingEndorsements.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Verification Requests
          <Badge variant="secondary" className="ml-auto">{pendingEndorsements.length}</Badge>
        </CardTitle>
        <CardDescription>Confirm credits from people you've worked with</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingEndorsements.map((endorsement) => (
          <div key={endorsement.id} className="p-3 rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={endorsement.requester_profile?.avatar_url || ''} />
                <AvatarFallback>{endorsement.requester_profile?.full_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {endorsement.requester_profile?.full_name || 'Someone'} wants you to verify:
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>{endorsement.credits?.project_name}</strong> — {endorsement.credits?.role}
                  {endorsement.credits?.year && <span> ({endorsement.credits.year})</span>}
                </p>
                {endorsement.relationship && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {endorsement.relationship}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(endorsement.requested_at).toLocaleDateString()}
              </div>
            </div>

            {/* Optional testimonial */}
            <Textarea
              placeholder="Add a testimonial (optional) — e.g., 'Great to work with, delivered exceptional results'"
              value={testimonials[endorsement.id] || ''}
              onChange={(e) => setTestimonials(prev => ({ ...prev, [endorsement.id]: e.target.value }))}
              className="text-sm min-h-[60px]"
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => respondToEndorsement(endorsement.id, true)}
                disabled={respondingId === endorsement.id}
              >
                {respondingId === endorsement.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Confirm & Endorse
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respondToEndorsement(endorsement.id, false)}
                disabled={respondingId === endorsement.id}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
