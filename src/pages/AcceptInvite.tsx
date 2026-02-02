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
        // If not authenticated, redirect to auth with this URL as redirect
        if (!user) {
          const currentUrl = `/accept-invite/${projectId}?email=${encodeURIComponent(email || '')}`;
          navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }

        // Check if this is a user-specific invitation (from in-app notification)
        // Format: user-{userId}@platform.invite
        const isUserInvite = email?.startsWith('user-') && email?.endsWith('@platform.invite');
        
        if (isUserInvite) {
          // Extract user ID from the email format
          const invitedUserId = email.replace('user-', '').replace('@platform.invite', '');
          
          // Verify current user matches the invited user
          if (user.id !== invitedUserId) {
            toast({
              title: "Wrong account",
              description: "Please log in with the account that received the invitation.",
              variant: "destructive",
            });
            navigate("/circle");
            return;
          }
          
          // Find invitation by user_id (could be pending or with this email)
          const { data: invitation, error: inviteError } = await supabase
            .from('project_collaborators')
            .select('*')
            .eq('project_id', projectId)
            .or(`user_id.eq.${user.id},email.eq.${email}`)
            .maybeSingle();

          if (inviteError) throw inviteError;

          if (invitation) {
            if (invitation.status === 'pending') {
              // Accept the invitation
              const { error: updateError } = await supabase
                .from('project_collaborators')
                .update({
                  status: 'accepted',
                  user_id: user.id,
                  accepted_at: new Date().toISOString()
                })
                .eq('id', invitation.id);

              if (updateError) throw updateError;

              toast({
                title: "Welcome to the project! 🎉",
                description: "You've successfully joined the project team.",
              });
            } else if (invitation.status === 'accepted') {
              // Already accepted - just redirect
              toast({
                title: "Already a member",
                description: "You're already part of this project.",
              });
            }
          } else {
            toast({
              title: "Invitation not found",
              description: "This invitation may have expired or been removed.",
              variant: "destructive",
            });
            navigate("/circle");
            return;
          }
        } else {
          // Regular email-based invitation flow
          const { data: invitation, error: inviteError } = await supabase
            .from('project_collaborators')
            .select('*')
            .eq('project_id', projectId)
            .eq('email', email?.toLowerCase())
            .eq('status', 'pending')
            .maybeSingle();

          if (inviteError) throw inviteError;

          if (invitation) {
            // Update the invitation to accepted and link to user
            const { error: updateError } = await supabase
              .from('project_collaborators')
              .update({
                status: 'accepted',
                user_id: user.id,
                accepted_at: new Date().toISOString()
              })
              .eq('id', invitation.id);

            if (updateError) throw updateError;

            toast({
              title: "Welcome to the project! 🎉",
              description: "You've successfully joined the project team.",
            });
          } else {
            // Check if user already has access
            const { data: existingAccess } = await supabase
              .from('project_collaborators')
              .select('*')
              .eq('project_id', projectId)
              .eq('user_id', user.id)
              .eq('status', 'accepted')
              .maybeSingle();

            if (existingAccess) {
              toast({
                title: "Already a member",
                description: "You're already part of this project.",
              });
            } else {
              toast({
                title: "Invitation not found",
                description: "This invitation may have expired or been used already.",
                variant: "destructive",
              });
            }
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

    if (projectId && email) {
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
