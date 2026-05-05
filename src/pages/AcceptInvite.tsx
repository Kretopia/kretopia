import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AcceptInvite = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [processing, setProcessing] = useState(true);
  const email = searchParams.get("email");

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    const processInvitation = async () => {
      try {
        // If not authenticated: try to mint/look-up a guest preview token so the
        // user can open the workspace immediately without signing up.
        if (!user) {
          if (email && projectId) {
            try {
              const { data: token } = await supabase.rpc(
                "get_or_create_guest_token_for_invite",
                { _project_id: projectId, _email: email },
              );
              if (token) {
                navigate(`/guest/${encodeURIComponent(token as string)}`, { replace: true });
                return;
              }
            } catch (e) {
              console.warn("guest token lookup failed", e);
            }
          }
          const qs = email ? `?email=${encodeURIComponent(email)}` : '';
          const currentUrl = `/accept-invite/${projectId}${qs}`;
          navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        // Legacy placeholder format (kept for backward compatibility with old notifications)
        const isLegacyUserInvite = email?.startsWith('user-') && email?.endsWith('@platform.invite');
        const legacyInvitedUserId = isLegacyUserInvite
          ? email!.replace('user-', '').replace('@platform.invite', '')
          : null;

        if (legacyInvitedUserId && user.id !== legacyInvitedUserId) {
          toast({
            title: "Wrong account",
            description: "Please log in with the account that received the invitation.",
            variant: "destructive",
          });
          navigate("/circle");
          return;
        }

        // Look up the invitation. Prefer matching by user_id (new flow); fall back to email.
        let invitationQuery = supabase
          .from('project_collaborators')
          .select('*')
          .eq('project_id', projectId);

        if (email && !isLegacyUserInvite) {
          // Email-based invite: match by either user_id or email
          invitationQuery = invitationQuery.or(`user_id.eq.${user.id},email.eq.${email.toLowerCase()}`);
        } else {
          // In-app invite (no email param OR legacy placeholder): match by user_id
          invitationQuery = invitationQuery.eq('user_id', user.id);
        }

        const { data: invitation, error: inviteError } = await invitationQuery.maybeSingle();

        if (inviteError) throw inviteError;

        if (invitation) {
          if (invitation.status === 'pending') {
            const { error: updateError } = await supabase
              .from('project_collaborators')
              .update({
                status: 'accepted',
                user_id: user.id,
                accepted_at: new Date().toISOString(),
              })
              .eq('id', invitation.id);

            if (updateError) throw updateError;

            toast({
              title: "Welcome to the project!",
              description: "You've successfully joined the project team.",
            });
          } else {
            toast({
              title: "Already a member",
              description: "You're already part of this project.",
            });
          }
        } else {
          // Check if user already has access
          const { data: existingAccess } = await supabase
            .from('project_collaborators')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .eq('status', 'accepted')
            .maybeSingle();

          if (!existingAccess) {
            toast({
              title: "Invitation not found",
              description: "This invitation may have expired or been used already.",
              variant: "destructive",
            });
          }
        }

        // Redirect to project
        navigate(`/desk/${projectId}`);
      } catch (error: any) {
        console.error("Error processing invitation:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to process invitation",
          variant: "destructive",
        });
        navigate("/circle");
      } finally {
        setProcessing(false);
      }
    };

    if (projectId) {
      processInvitation();
    } else {
      toast({
        title: "Invalid invitation",
        description: "Missing required information",
        variant: "destructive",
      });
      navigate("/circle");
    }
  }, [user, loading, projectId, email, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Processing invitation...</h2>
        <p className="text-muted-foreground">Please wait while we set up your access</p>
      </div>
    </div>
  );
};

export default AcceptInvite;
