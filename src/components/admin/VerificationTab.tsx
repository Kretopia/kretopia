import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VerificationRequest {
  id: string;
  user_id: string;
  profile_data: any;
  ai_score: number;
  ai_decision: string;
  ai_reasoning: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

export const VerificationTab = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    
    // Fetch verification requests
    const { data: requestsData, error: requestsError } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching verification requests:", requestsError);
      toast({
        title: "Error",
        description: "Failed to load verification requests",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch associated profiles
    if (requestsData && requestsData.length > 0) {
      const userIds = requestsData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Merge the data
      const mergedData = requestsData.map(request => {
        const profile = profilesData?.find(p => p.user_id === request.user_id);
        return {
          ...request,
          profiles: profile || { full_name: "Unknown", avatar_url: "", role: "Unknown" }
        };
      });

      setRequests(mergedData as VerificationRequest[]);
    } else {
      setRequests([]);
    }

    setLoading(false);
  };

  const handleApprove = async (request: VerificationRequest) => {
    setActionLoading(true);
    try {
      // Update verification request
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", request.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Approved",
        description: "User profile has been verified",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve profile",
        variant: "destructive",
      });
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Update verification request
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest.id);

      if (requestError) throw requestError;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          verification_notes: rejectionReason,
        })
        .eq("user_id", selectedRequest.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Rejected",
        description: "Profile has been rejected",
      });

      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast({
        title: "Error",
        description: "Failed to reject profile",
        variant: "destructive",
      });
    }
    setActionLoading(false);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) return <Badge className="bg-green-500">High: {score}</Badge>;
    if (score >= 50) return <Badge variant="secondary">Medium: {score}</Badge>;
    return <Badge variant="destructive">Low: {score}</Badge>;
  };

  const renderRequest = (request: VerificationRequest) => (
    <Card key={request.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {request.profiles.avatar_url && (
              <img
                src={request.profiles.avatar_url}
                alt={request.profiles.full_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div>
              <CardTitle className="text-lg">{request.profiles.full_name}</CardTitle>
              <CardDescription>{request.profiles.role}</CardDescription>
            </div>
          </div>
          {getScoreBadge(request.ai_score)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">AI Analysis</h4>
          <p className="text-sm text-muted-foreground">{request.ai_reasoning}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Profile Data</h4>
          <div className="text-sm space-y-1">
            <p><strong>Account Type:</strong> {request.profile_data.accountType}</p>
            {request.profile_data.bio && (
              <p><strong>Bio:</strong> {request.profile_data.bio}</p>
            )}
            {request.profile_data.website && (
              <p>
                <strong>Website:</strong>{" "}
                <a href={request.profile_data.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {request.profile_data.website} <ExternalLink className="inline h-3 w-3" />
                </a>
              </p>
            )}
            {request.profile_data.portfolioItems > 0 && (
              <p><strong>Portfolio Items:</strong> {request.profile_data.portfolioItems}</p>
            )}
          </div>
        </div>

        {request.profile_data.socialLinks && Object.keys(request.profile_data.socialLinks).length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Social Links</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(request.profile_data.socialLinks).map(([platform, url]: [string, any]) => 
                url && (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80 flex items-center gap-1"
                  >
                    {platform} <ExternalLink className="h-3 w-3" />
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {request.status === "flagged" && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleApprove(request)}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSelectedRequest(request);
                setShowRejectDialog(true);
              }}
              disabled={actionLoading}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const flaggedRequests = requests.filter(r => r.status === "flagged");
  const approvedRequests = requests.filter(r => r.status === "approved");
  const rejectedRequests = requests.filter(r => r.status === "rejected");

  return (
    <>
      <Tabs defaultValue="flagged" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flagged">
            Flagged ({flaggedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="space-y-4">
          {flaggedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No profiles flagged for review</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            flaggedRequests.map(renderRequest)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No pending verifications</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(renderRequest)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.map(renderRequest)}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.map(renderRequest)}
        </TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Profile Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the user.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this profile doesn't meet verification standards..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reject Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};