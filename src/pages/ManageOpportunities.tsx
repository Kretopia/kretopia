import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Eye, Link as LinkIcon, Pause, Play, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Opportunity {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  image_url: string;
  compensation: string;
}

const ManageOpportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching opportunities:', error);
    } else {
      setOpportunities(data || []);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    
    const { error } = await supabase
      .from('opportunities')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update opportunity status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Opportunity ${newStatus === 'active' ? 'activated' : 'paused'}`,
      });
      fetchOpportunities();
    }
  };

  const deleteOpportunity = async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete opportunity",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Opportunity deleted",
      });
      fetchOpportunities();
    }
  };

  const copyShareLink = (id: string) => {
    const url = `${window.location.origin}/opportunity/${id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied! 📋",
      description: "Share this link to promote your opportunity",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Briefcase className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Manage Opportunities</h1>
          <p className="text-muted-foreground">Control your posted opportunities and track their status</p>
        </div>

        {opportunities.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Opportunities Yet</h2>
            <p className="text-muted-foreground mb-4">You haven't posted any opportunities yet</p>
            <Link to="/">
              <Button>Post Your First Opportunity</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image */}
                  {opp.image_url && (
                    <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={opp.image_url}
                        alt={opp.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{opp.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                          </Badge>
                          <Badge variant={opp.status === 'active' ? 'default' : 'secondary'}>
                            {opp.status === 'active' ? 'Active' : 'Closed'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      Posted {new Date(opp.created_at).toLocaleDateString()}
                      {opp.compensation && ` • ${opp.compensation}`}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/opportunity/${opp.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(opp.id)}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(opp.id, opp.status)}
                      >
                        {opp.status === 'active' ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            End Campaign
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Reactivate
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this opportunity.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteOpportunity(opp.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageOpportunities;
