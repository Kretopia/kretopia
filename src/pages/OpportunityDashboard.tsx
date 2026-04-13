import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, MapPin, DollarSign, User, Users, Star, Sparkles, Mail, Eye, Edit, Crown, Trophy, TrendingUp, Filter, LayoutGrid, List, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { EditOpportunityDialog } from "@/components/EditOpportunityDialog";
import { FreeTierGate } from "@/components/FreeTierGate";
import { ApplicantPipeline } from "@/components/opportunity/ApplicantPipeline";
import { OpportunityAnalytics } from "@/components/opportunity/OpportunityAnalytics";
import { hasProAccess } from "@/lib/subscriptionConfig";

interface Applicant {
  id: string;
  applicant_id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  cover_letter: string;
  portfolio_links?: string[];
  status: string;
  created_at: string;
  expected_rate?: string;
  availability?: string;
  ai_match_score?: number;
  match_reasons?: string[];
  professional_skills?: string[];
}

interface Opportunity {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  applications_count: number;
  new_applications: number;
}

const PIPELINE_STATUSES = ['pending', 'shortlisted', 'accepted', 'rejected'] as const;

const OpportunityDashboard = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [dashboardTab, setDashboardTab] = useState<'applicants' | 'analytics'>('applicants');
  const autoAnalyzedRef = useRef<Set<string>>(new Set());
  const { user, loading: authLoading, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPro = hasProAccess(subscriptionInfo.tier as any);
  const requestedOpportunityId = searchParams.get('opportunity');

  useEffect(() => {
    console.log('[OpportunityDashboard] Auth state - loading:', authLoading, 'user:', user?.id);
    
    if (authLoading) {
      console.log('[OpportunityDashboard] Still loading auth...');
      return;
    }
    
    if (!user) {
      console.log('[OpportunityDashboard] No user after auth loaded, redirecting to auth');
      navigate('/auth');
      return;
    }
    
    console.log('[OpportunityDashboard] Fetching opportunities');
    fetchOpportunities();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedOppId) {
      fetchApplicants(selectedOppId);
    }
  }, [selectedOppId]);

  const fetchOpportunities = async () => {
    if (!user) return;

    // First get all opportunities
    const { data: oppsData, error: oppsError } = await supabase
      .from('opportunities')
      .select('id, title, type, status, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (oppsError) {
      console.error('Error fetching opportunities:', oppsError);
      toast.error('Failed to load opportunities');
      setLoading(false);
      return;
    }

    // Get application counts for each opportunity
    const formatted = await Promise.all(
      (oppsData || []).map(async (opp: any) => {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('opportunity_id', opp.id);

        return {
          id: opp.id,
          title: opp.title,
          type: opp.type,
          status: opp.status,
          created_at: opp.created_at,
          applications_count: count || 0,
          new_applications: 0,
        };
      })
    );

    setOpportunities(formatted);
    if (formatted.length > 0) {
      const initialOpportunityId = formatted.some((opp) => opp.id === requestedOpportunityId)
        ? requestedOpportunityId
        : formatted[0].id;
      setSelectedOppId(initialOpportunityId);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!requestedOpportunityId || opportunities.length === 0 || requestedOpportunityId === selectedOppId) {
      return;
    }

    if (opportunities.some((opp) => opp.id === requestedOpportunityId)) {
      setSelectedOppId(requestedOpportunityId);
    }
  }, [requestedOpportunityId, opportunities, selectedOppId]);

  const handleOpportunityChange = (opportunityId: string) => {
    setSelectedOppId(opportunityId);
    setSearchParams({ opportunity: opportunityId }, { replace: true });
  };

  const fetchApplicants = async (opportunityId: string) => {
    setLoading(true);
    
    // Fetch applications first
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('id, applicant_id, cover_letter, portfolio_links, status, created_at, expected_rate, availability')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('Error fetching applicants:', appsError);
      toast.error('Failed to load applications');
      setLoading(false);
      return;
    }

    const apps = appsData || [];
    
    // Fetch profiles separately using the applicant IDs
    const applicantIds = [...new Set(apps.map(a => a.applicant_id))];
    let profilesMap: Record<string, any> = {};
    
    if (applicantIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, professional_skills')
        .in('user_id', applicantIds);
      
      if (profilesData) {
        profilesMap = Object.fromEntries(profilesData.map(p => [p.user_id, p]));
      }
    }

    const formatted = apps.map((app: any) => {
      const profile = profilesMap[app.applicant_id];
      return {
        id: app.id,
        applicant_id: app.applicant_id,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url,
        role: profile?.role || 'Creator',
        cover_letter: app.cover_letter,
        portfolio_links: app.portfolio_links,
        status: app.status,
        created_at: app.created_at,
        expected_rate: app.expected_rate,
        availability: app.availability,
        professional_skills: profile?.professional_skills || [],
      };
    });
    setApplicants(formatted);
    setLoading(false);
  };

  const analyzeWithAI = useCallback(async () => {
    if (!selectedOppId || applicants.length === 0) return;

    setAnalyzingAI(true);
    try {
      const { data: oppData } = await supabase
        .from('opportunities')
        .select('title, description, skills, requirements')
        .eq('id', selectedOppId)
        .single();

      if (!oppData) throw new Error('Opportunity not found');

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          type: 'ranking',
          messages: [
            {
              role: 'user',
              content: `Score and rank these applicants for the opportunity. Be generous with scores (60+ is good match).

OPPORTUNITY:
Title: ${oppData.title}
Description: ${oppData.description}
Required Skills: ${oppData.skills?.join(', ') || 'Not specified'}
Requirements: ${oppData.requirements || 'Not specified'}

APPLICANTS:
${applicants.map((a, i) => `${i}. ${a.full_name} - ${a.role}
Skills: ${a.professional_skills?.join(', ') || 'None listed'}
Cover Letter: ${a.cover_letter?.substring(0, 200)}...
Rate: ${a.expected_rate || 'Not specified'}
Availability: ${a.availability || 'Not specified'}`).join('\n\n')}

For each applicant, provide:
1. Match score (0-100) - Be generous, most should be 60+
2. 3 specific reasons why they're a good/bad match
3. 1 risk or concern (if any)

Return ONLY valid JSON array:
[{"index": 0, "score": 85, "reasons": ["Strong skill match", "Relevant portfolio", "Good availability"], "risk": "No concern"}]`
            }
          ],
        }
      });

      if (error) throw error;

      const content = data?.content;
      if (!content) throw new Error('No content returned');

      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const scores = JSON.parse(jsonStr);
      
      const scoredApplicants = applicants.map((applicant, index) => {
        const scoreData = scores.find((s: any) => s.index === index);
        return {
          ...applicant,
          ai_match_score: scoreData?.score || 50,
          match_reasons: scoreData?.reasons || [],
          ai_risk: scoreData?.risk || null,
        };
      });

      scoredApplicants.sort((a, b) => (b.ai_match_score || 0) - (a.ai_match_score || 0));
      setApplicants(scoredApplicants);
      setSortBy('score');
      toast.success('AI ranking complete!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('AI analysis failed');
    } finally {
      setAnalyzingAI(false);
    }
  }, [selectedOppId, applicants]);

  // Auto-trigger AI ranking for Pro users when applicants load
  useEffect(() => {
    if (isPro && selectedOppId && applicants.length > 0 && !analyzingAI && !autoAnalyzedRef.current.has(selectedOppId)) {
      autoAnalyzedRef.current.add(selectedOppId);
      analyzeWithAI();
    }
  }, [isPro, selectedOppId, applicants.length]);

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    setApplicants(prev => prev.map(a => 
      a.id === applicationId ? { ...a, status: newStatus } : a
    ));

    if (newStatus === 'accepted') {
      // Create a project workspace for the accepted applicant
      const applicant = applicants.find(a => a.id === applicationId);
      const opp = opportunities.find(o => o.id === selectedOppId);
      
      if (applicant && opp && user) {
        try {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              title: opp.title,
              description: `Project created from opportunity: ${opp.title}`,
              created_by: user.id,
              status: 'active' as const,
            })
            .select()
            .single();

          if (projectError) throw projectError;

          // Invite the accepted applicant as a collaborator (two-step: insert then update to accepted)
          const { data: collabData } = await supabase
            .from('project_collaborators')
            .insert({
              project_id: project.id,
              user_id: applicant.applicant_id,
              email: `user-${applicant.applicant_id}@platform.invite`,
              invited_by: user.id,
              role: 'member',
              status: 'pending',
            })
            .select()
            .single();

          if (collabData) {
            await supabase
              .from('project_collaborators')
              .update({ status: 'accepted' })
              .eq('id', collabData.id);
          }

          // Send project invitation notification
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

          await supabase.functions.invoke('send-project-invitation', {
            body: {
              projectTitle: opp.title,
              projectId: project.id,
              inviterName: userProfile?.full_name || 'A ThriveIN user',
              inviteeUserId: applicant.applicant_id,
            }
          });

          toast.success(`Application accepted! Project workspace "${opp.title}" created.`, {
            action: {
              label: 'Open Project',
              onClick: () => navigate(`/desk/${project.id}`),
            },
          });
          return;
        } catch (err) {
          console.error('Project creation error:', err);
          toast.success('Application accepted! (Project creation failed — you can create one manually)');
          return;
        }
      }
    }

    toast.success(`Application ${newStatus}`);
  };

  const getMatchBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 80) return <Badge className="bg-primary text-primary-foreground"><Star className="w-3 h-3 mr-1" />Perfect Match</Badge>;
    if (score >= 70) return <Badge className="bg-accent text-accent-foreground">Great Match</Badge>;
    if (score >= 60) return <Badge variant="outline" className="border-primary/50 text-primary">Good Match</Badge>;
    return <Badge variant="secondary">Fair Match</Badge>;
  };

  const renderApplicantCard = (applicant: Applicant) => (
    <Card key={applicant.id} className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
            <AvatarImage src={applicant.avatar_url} />
            <AvatarFallback>{applicant.full_name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-1">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg truncate">{applicant.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{applicant.role}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {getMatchBadge(applicant.ai_match_score)}
                <Badge variant={
                  applicant.status === 'accepted' ? 'default' :
                  applicant.status === 'rejected' ? 'destructive' :
                  applicant.status === 'shortlisted' ? 'outline' : 'secondary'
                } className={applicant.status === 'shortlisted' ? 'border-primary text-primary' : ''}>
                  {applicant.status}
                </Badge>
              </div>
            </div>
            
            {applicant.ai_match_score && (
              <div className="mb-2 p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI Match: {applicant.ai_match_score}%</span>
                </div>
                {applicant.match_reasons && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {applicant.match_reasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Cover Letter</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{applicant.cover_letter}</p>
          </div>
          
          {applicant.expected_rate && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{applicant.expected_rate}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => navigate(`/profile/${applicant.applicant_id}`)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => navigate(`/messages?user=${applicant.applicant_id}`)}
            >
              <Mail className="w-3 h-3 mr-1" />
              Message
            </Button>
            {(applicant.status === 'pending' || applicant.status === 'shortlisted') && (
              <>
                {applicant.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => updateApplicationStatus(applicant.id, 'shortlisted')}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Shortlist
                  </Button>
                )}
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => updateApplicationStatus(applicant.id, 'accepted')}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                  onClick={() => updateApplicationStatus(applicant.id, 'rejected')}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Opportunities Posted</h3>
            <p className="text-muted-foreground mb-4">
              Create your first opportunity to start receiving applications
            </p>
            <PostOpportunityDialog
              open={showPostDialog}
              onOpenChange={setShowPostDialog}
              onSuccess={() => {
                fetchOpportunities();
                setShowPostDialog(false);
              }}
              trigger={
                <Button>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Post Opportunity
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedOpp = opportunities.find(o => o.id === selectedOppId);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Posted Opportunities</h1>
          <p className="text-muted-foreground">
            Review and manage applications to your opportunities
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/manage-opportunities')}
        >
          <User className="mr-2 h-4 w-4" />
          View My Applications
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <Select value={selectedOppId || undefined} onValueChange={handleOpportunityChange}>
          <SelectTrigger className="w-full md:w-96">
            <SelectValue placeholder="Select opportunity" />
          </SelectTrigger>
          <SelectContent>
            {opportunities.map(opp => (
              <SelectItem key={opp.id} value={opp.id}>
                {opp.title} ({opp.applications_count} applications)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOppId && (
          <Button
            variant="outline"
            onClick={() => setEditingOpportunityId(selectedOppId)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {selectedOpp && (
        <>
          {/* Dashboard Tab Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex rounded-md border border-input overflow-hidden">
              <Button
                variant={dashboardTab === 'applicants' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setDashboardTab('applicants')}
              >
                <Users className="w-4 h-4 mr-1" />
                Applicants
              </Button>
              <Button
                variant={dashboardTab === 'analytics' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setDashboardTab('analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Analytics
                {!isPro && <Crown className="w-3 h-3 ml-1 text-primary" />}
              </Button>
            </div>
          </div>

          {dashboardTab === 'analytics' ? (
            <OpportunityAnalytics
              userId={user!.id}
              isPro={isPro}
              opportunities={opportunities}
              selectedOppId={selectedOppId}
            />
          ) : (
          <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">{selectedOpp.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>{applicants.length} total</span>
                <span>·</span>
                <span>{applicants.filter(a => a.status === 'shortlisted').length} shortlisted</span>
                <span>·</span>
                <span>{applicants.filter(a => a.status === 'accepted').length} accepted</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isPro ? (
                <div className="flex rounded-md border border-input overflow-hidden">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode('pipeline')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="opacity-60"
                  onClick={() => toast.info('Upgrade to Pro for Pipeline view')}
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Pipeline
                  <Crown className="w-3 h-3 ml-1 text-primary" />
                </Button>
              )}
              <Select value={sortBy} onValueChange={(v) => {
                setSortBy(v as 'date' | 'score');
                setApplicants(prev => [...prev].sort((a, b) => 
                  v === 'score' 
                    ? (b.ai_match_score || 0) - (a.ai_match_score || 0)
                    : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
              }}>
                <SelectTrigger className="w-36">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="score">By AI Score</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={analyzeWithAI}
                disabled={analyzingAI || applicants.length === 0}
                variant={isPro ? 'default' : 'outline'}
                className="w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {analyzingAI ? 'Ranking...' : isPro ? 'Re-rank with AI' : 'AI Match Score'}
              </Button>
            </div>
          </div>

          {/* Top Pick Card - Pro only */}
          {isPro && applicants.length > 0 && applicants[0].ai_match_score ? (
            <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Top Pick</p>
                  <p className="text-base font-bold truncate">{applicants[0].full_name}</p>
                  <p className="text-xs text-muted-foreground">{applicants[0].role} · {applicants[0].ai_match_score}% match</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/profile/${applicants[0].applicant_id}`)}>
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </CardContent>
            </Card>
          ) : !isPro && applicants.length > 0 ? (
            <FreeTierGate
              feature="aiApplicantRankings"
              featureLabel="AI Applicant Ranking"
              description="Upgrade to Pro for unlimited AI applicant ranking, match scores, and shortlisting."
            >
              <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Top Pick</p>
                    <p className="text-base font-bold">{applicants[0]?.full_name || "Applicant"}</p>
                    <p className="text-xs text-muted-foreground">{applicants[0]?.role || "Creator"} · {applicants[0]?.ai_match_score || 0}% match</p>
                  </div>
                </CardContent>
              </Card>
            </FreeTierGate>
          ) : null}
        </>
      )}

      {viewMode === 'pipeline' && isPro ? (
        <ApplicantPipeline
          applicants={applicants}
          onStatusChange={updateApplicationStatus}
        />
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All ({applicants.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({applicants.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="shortlisted">
              Shortlisted ({applicants.filter(a => a.status === 'shortlisted').length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({applicants.filter(a => a.status === 'accepted').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4">
              {applicants.map(renderApplicantCard)}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-4">
              {applicants.filter(a => a.status === 'pending').map(renderApplicantCard)}
            </div>
          </TabsContent>

          <TabsContent value="shortlisted" className="mt-6">
            <div className="grid gap-4">
              {applicants.filter(a => a.status === 'shortlisted').map(renderApplicantCard)}
              {applicants.filter(a => a.status === 'shortlisted').length === 0 && (
                <p className="text-center text-muted-foreground py-8">No shortlisted applicants yet. Use AI ranking to find the best matches.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            <div className="grid gap-4">
              {applicants.filter(a => a.status === 'accepted').map(renderApplicantCard)}
            </div>
          </TabsContent>
        </Tabs>
      )}
      </>
      )}

      {editingOpportunityId && (
        <EditOpportunityDialog
          opportunityId={editingOpportunityId}
          open={!!editingOpportunityId}
          onOpenChange={(open) => !open && setEditingOpportunityId(null)}
          onSuccess={() => {
            fetchOpportunities();
            setEditingOpportunityId(null);
          }}
        />
      )}
    </div>
  );
};

export default OpportunityDashboard;
