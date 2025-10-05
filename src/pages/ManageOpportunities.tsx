import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Clock, MapPin, DollarSign, ExternalLink, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Application {
  id: string;
  opportunity_title: string;
  opportunity_type: string;
  compensation: string;
  location: string;
  status: string;
  created_at: string;
  cover_letter: string;
  expected_rate?: string;
  availability?: string;
  application_notes?: string;
  opportunity_id: string;
}

const ManageOpportunities = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[ManageOpportunities] Component mounted, user:', user?.id);
    if (!user) {
      console.log('[ManageOpportunities] No user, redirecting to auth');
      navigate('/auth');
      return;
    }
    console.log('[ManageOpportunities] Fetching applications');
    fetchApplications();
  }, [user, navigate]);

  const fetchApplications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_applications_view')
      .select('*')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending Review" },
      reviewed: { variant: "default", label: "Reviewed" },
      accepted: { variant: "default", label: "Accepted" },
      rejected: { variant: "destructive", label: "Not Selected" },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filterApplications = (status?: string) => {
    if (!status) return applications;
    return applications.filter(app => app.status === status);
  };

  const renderApplicationCard = (app: Application) => (
    <Card key={app.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="mb-2">{app.opportunity_title}</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                <Briefcase className="mr-1 h-3 w-3" />
                {app.opportunity_type}
              </Badge>
              {app.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {app.location}
                </span>
              )}
              {app.compensation && (
                <span className="flex items-center gap-1 text-accent">
                  <DollarSign className="h-3 w-3" />
                  {app.compensation}
                </span>
              )}
            </div>
          </div>
          <div>{getStatusBadge(app.status)}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {app.cover_letter && (
            <div>
              <p className="text-sm font-medium mb-1">Cover Letter</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{app.cover_letter}</p>
            </div>
          )}
          
          {app.expected_rate && (
            <div>
              <p className="text-sm font-medium mb-1">Your Rate</p>
              <p className="text-sm text-muted-foreground">{app.expected_rate}</p>
            </div>
          )}

          {app.availability && (
            <div>
              <p className="text-sm font-medium mb-1">Availability</p>
              <p className="text-sm text-muted-foreground">{app.availability}</p>
            </div>
          )}

          {app.application_notes && (
            <div>
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{app.application_notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Applied {new Date(app.created_at).toLocaleDateString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/opportunity/${app.opportunity_id}`)}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Opportunity
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track and manage your opportunity applications
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="all">
            All ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterApplications('pending').length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({filterApplications('reviewed').length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({filterApplications('accepted').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Not Selected ({filterApplications('rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring opportunities and apply to ones that interest you
                </p>
                <Button onClick={() => navigate('/discover')}>
                  Browse Opportunities
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {applications.map(renderApplicationCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterApplications('pending').map(renderApplicationCard)}
          </div>
        </TabsContent>

        <TabsContent value="reviewed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterApplications('reviewed').map(renderApplicationCard)}
          </div>
        </TabsContent>

        <TabsContent value="accepted">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterApplications('accepted').map(renderApplicationCard)}
          </div>
        </TabsContent>

        <TabsContent value="rejected">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterApplications('rejected').map(renderApplicationCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageOpportunities;
