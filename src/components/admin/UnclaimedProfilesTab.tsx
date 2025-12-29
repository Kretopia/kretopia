import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  Upload, 
  Link, 
  Search, 
  CheckCircle, 
  Clock, 
  XCircle,
  ExternalLink,
  Copy,
  Loader2,
  Users,
  FileSpreadsheet,
  Sparkles,
  Radar,
  Globe,
  Plus
} from 'lucide-react';

interface UnclaimedProfile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  is_claimed: boolean;
  claim_token: string | null;
  profile_source: string | null;
  imported_from_url: string | null;
  created_at: string;
}

interface ClaimRequest {
  id: string;
  profile_id: string;
  claimant_email: string;
  verification_method: string;
  verification_proof: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface DiscoveredProfile {
  name: string;
  role: string;
  bio?: string;
  location?: string;
  sourceUrl: string;
  skills?: string[];
  imageUrl?: string;
}

export function UnclaimedProfilesTab() {
  const [unclaimedProfiles, setUnclaimedProfiles] = useState<UnclaimedProfile[]>([]);
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  
  // AI Discovery states
  const [discovering, setDiscovering] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [discoveredProfiles, setDiscoveredProfiles] = useState<DiscoveredProfile[]>([]);
  const [discoveryType, setDiscoveryType] = useState<'industry' | 'platform' | 'news'>('industry');
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryPlatform, setDiscoveryPlatform] = useState('imdb');
  const [importingDiscovered, setImportingDiscovered] = useState<string | null>(null);
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  
  // Form states
  const [newProfile, setNewProfile] = useState({
    full_name: '',
    role: '',
    bio: '',
    location: '',
    avatar_url: ''
  });
  const [importUrl, setImportUrl] = useState('');
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch unclaimed profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, is_claimed, claim_token, profile_source, imported_from_url, created_at')
        .eq('is_claimed', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setUnclaimedProfiles(profiles || []);

      // Fetch pending claim requests
      const { data: requests, error: requestsError } = await supabase
        .from('profile_claim_requests')
        .select('*, profiles:profile_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setClaimRequests(requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load unclaimed profiles');
    } finally {
      setLoading(false);
    }
  };

  const createUnclaimedProfile = async () => {
    if (!newProfile.full_name || !newProfile.role) {
      toast.error('Name and role are required');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_unclaimed_profile', {
        p_full_name: newProfile.full_name,
        p_role: newProfile.role,
        p_bio: newProfile.bio || null,
        p_location: newProfile.location || null,
        p_avatar_url: newProfile.avatar_url || null,
        p_source: 'admin_created'
      });

      if (error) throw error;

      toast.success('Unclaimed profile created!');
      setShowCreateDialog(false);
      setNewProfile({ full_name: '', role: '', bio: '', location: '', avatar_url: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const importFromUrl = async () => {
    if (!importUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setImportingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-profile-from-url', {
        body: { url: importUrl }
      });

      if (error) throw error;

      if (data?.profile_id) {
        toast.success(`Profile imported: ${data.profile_name}`);
        setShowImportDialog(false);
        setImportUrl('');
        fetchData();
      } else {
        toast.error(data?.error || 'Failed to import profile');
      }
    } catch (error) {
      console.error('Error importing profile:', error);
      toast.error('Failed to import from URL');
    } finally {
      setImportingUrl(false);
    }
  };

  const importBulkProfiles = async () => {
    if (!bulkData.trim()) {
      toast.error('Please enter profile data');
      return;
    }

    setCreating(true);
    try {
      // Parse CSV-like data: Name, Role, Location (one per line)
      const lines = bulkData.trim().split('\n');
      let successCount = 0;

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const [name, role, location] = parts;
          
          const { error } = await supabase.rpc('create_unclaimed_profile', {
            p_full_name: name,
            p_role: role,
            p_location: location || null,
            p_source: 'bulk_import'
          });

          if (!error) successCount++;
        }
      }

      toast.success(`Imported ${successCount} profiles`);
      setShowBulkDialog(false);
      setBulkData('');
      fetchData();
    } catch (error) {
      console.error('Error bulk importing:', error);
      toast.error('Failed to import profiles');
    } finally {
      setCreating(false);
    }
  };

  const copyClaimLink = (claimToken: string) => {
    const link = `${window.location.origin}/claim/${claimToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Claim link copied!');
  };

  const handleClaimRequest = async (requestId: string, approve: boolean) => {
    try {
      // First get the claim request details
      const { data: claimRequest, error: fetchError } = await supabase
        .from('profile_claim_requests')
        .select('profile_id, claimant_user_id')
        .eq('id', requestId)
        .single();
      
      if (fetchError) throw fetchError;

      if (approve && claimRequest?.claimant_user_id) {
        // Get the claim token for the profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('claim_token')
          .eq('user_id', claimRequest.profile_id)
          .single();
        
        if (profileError) throw profileError;
        
        if (profileData?.claim_token) {
          // Call the claim_profile function to transfer data
          const { data: claimResult, error: claimError } = await supabase.rpc('claim_profile', {
            p_claim_token: profileData.claim_token,
            p_user_id: claimRequest.claimant_user_id
          });
          
          if (claimError) throw claimError;
          
          if (!claimResult) {
            toast.error('Failed to transfer profile data');
            return;
          }
        }
      }

      // Update the claim request status
      const { error } = await supabase
        .from('profile_claim_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to the claimant if approved
      if (approve && claimRequest?.claimant_user_id) {
        await supabase.from('notifications').insert({
          user_id: claimRequest.claimant_user_id,
          title: 'Profile Claim Approved! 🎉',
          message: 'Your profile claim has been approved. Your profile data has been transferred to your account.',
          type: 'system',
          link: '/profile',
          action_url: '/profile',
          action_text: 'View Your Profile'
        });
      }

      toast.success(approve ? 'Claim approved and profile transferred!' : 'Claim rejected');
      fetchData();
    } catch (error) {
      console.error('Error updating claim request:', error);
      toast.error('Failed to update claim request');
    }
  };

  const discoverProfiles = async (loadMore = false) => {
    if (!discoveryQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    const page = loadMore ? discoveryPage + 1 : 1;
    
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setDiscovering(true);
      setDiscoveredProfiles([]);
      setDiscoveryPage(1);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('discover-profiles', {
        body: {
          searchType: discoveryType,
          query: discoveryQuery,
          platform: discoveryPlatform,
          page
        }
      });

      if (error) throw error;

      if (data?.success && data.profiles) {
        if (loadMore) {
          setDiscoveredProfiles(prev => [...prev, ...data.profiles]);
        } else {
          setDiscoveredProfiles(data.profiles);
        }
        setDiscoveryPage(page);
        setHasMoreResults(data.hasMore || false);
        toast.success(`Found ${data.profiles.length} profiles`);
      } else {
        toast.error(data?.error || 'No profiles found');
      }
    } catch (error) {
      console.error('Error discovering profiles:', error);
      toast.error('Failed to discover profiles');
    } finally {
      setDiscovering(false);
      setLoadingMore(false);
    }
  };

  const importDiscoveredProfile = async (profile: DiscoveredProfile) => {
    setImportingDiscovered(profile.name);
    
    try {
      const { data, error } = await supabase.rpc('create_unclaimed_profile', {
        p_full_name: profile.name,
        p_role: profile.role,
        p_bio: profile.bio || null,
        p_location: profile.location || null,
        p_avatar_url: profile.imageUrl || null,
        p_professional_skills: profile.skills ? JSON.stringify(profile.skills) : '[]',
        p_imported_from_url: profile.sourceUrl,
        p_source: 'ai_discovery'
      });

      if (error) throw error;

      toast.success(`Imported: ${profile.name}`);
      setDiscoveredProfiles(prev => prev.filter(p => p.name !== profile.name));
      fetchData();
    } catch (error) {
      console.error('Error importing profile:', error);
      toast.error('Failed to import profile');
    } finally {
      setImportingDiscovered(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Unclaimed Profiles</h2>
          <p className="text-muted-foreground">
            Create profiles for real professionals that they can claim later
          </p>
        </div>
        <div className="flex gap-2">
          {/* Manual Create */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Unclaimed Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newProfile.full_name}
                    onChange={(e) => setNewProfile(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="e.g., Pharrell Williams"
                  />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Input
                    value={newProfile.role}
                    onChange={(e) => setNewProfile(p => ({ ...p, role: e.target.value }))}
                    placeholder="e.g., Producer, Artist"
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={newProfile.bio}
                    onChange={(e) => setNewProfile(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Brief professional bio..."
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newProfile.location}
                    onChange={(e) => setNewProfile(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g., Los Angeles, CA"
                  />
                </div>
                <div>
                  <Label>Avatar URL</Label>
                  <Input
                    value={newProfile.avatar_url}
                    onChange={(e) => setNewProfile(p => ({ ...p, avatar_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <Button 
                  onClick={createUnclaimedProfile} 
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Import from URL */}
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                From URL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from URL</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Paste an IMDB, Discogs, AllMusic, or public profile URL. AI will extract the information.
                </p>
                <div>
                  <Label>Profile URL</Label>
                  <Input
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://www.imdb.com/name/nm..."
                  />
                </div>
                <Button 
                  onClick={importFromUrl} 
                  disabled={importingUrl}
                  className="w-full"
                >
                  {importingUrl ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
                  Import Profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Import */}
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Bulk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Profiles</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Enter one profile per line: Name, Role, Location (optional)
                </p>
                <Textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="John Smith, Music Producer, Los Angeles&#10;Jane Doe, Singer-Songwriter, Nashville&#10;..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button 
                  onClick={importBulkProfiles} 
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import All
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover" className="gap-2">
            <Radar className="h-4 w-4" />
            AI Discovery
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-2">
            <Users className="h-4 w-4" />
            Profiles ({unclaimedProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-2">
            <Clock className="h-4 w-4" />
            Claims ({claimRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-primary" />
                AI Profile Discovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Let AI search the web and discover creator profiles from various sources.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Discovery Type</Label>
                  <Select value={discoveryType} onValueChange={(v: any) => setDiscoveryType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industry">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Industry Search
                        </div>
                      </SelectItem>
                      <SelectItem value="platform">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Platform Crawl
                        </div>
                      </SelectItem>
                      <SelectItem value="news">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          News & Press
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {discoveryType === 'platform' && (
                  <div>
                    <Label>Platform</Label>
                    <Select value={discoveryPlatform} onValueChange={setDiscoveryPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imdb">IMDb</SelectItem>
                        <SelectItem value="discogs">Discogs</SelectItem>
                        <SelectItem value="spotify">Spotify</SelectItem>
                        <SelectItem value="behance">Behance</SelectItem>
                        <SelectItem value="dribbble">Dribbble</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label>
                  {discoveryType === 'industry' && 'Search Query (e.g., "music producers in Los Angeles")'}
                  {discoveryType === 'platform' && 'Search Term (e.g., "electronic music", "cinematographer")'}
                  {discoveryType === 'news' && 'Creator Name or Topic'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={discoveryQuery}
                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                    placeholder={
                      discoveryType === 'industry' 
                        ? "music producer Los Angeles" 
                        : discoveryType === 'platform'
                        ? "electronic music"
                        : "Grammy winning producer"
                    }
                    onKeyDown={(e) => e.key === 'Enter' && discoverProfiles()}
                  />
                  <Button onClick={() => discoverProfiles(false)} disabled={discovering}>
                    {discovering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discovery Results */}
          {discoveredProfiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Discovered Profiles ({discoveredProfiles.length})</h3>
                <div className="flex gap-2">
                  {hasMoreResults && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => discoverProfiles(true)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Load More
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDiscoveredProfiles([]);
                      setHasMoreResults(false);
                      setDiscoveryPage(1);
                    }}
                  >
                    Clear Results
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {discoveredProfiles.map((profile, idx) => (
                  <Card key={idx} className="relative">
                    <Badge 
                      variant="secondary" 
                      className="absolute top-3 right-3 bg-blue-500/20 text-blue-600"
                    >
                      Discovered
                    </Badge>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile.imageUrl} />
                          <AvatarFallback>
                            {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
                          {profile.location && (
                            <p className="text-xs text-muted-foreground">{profile.location}</p>
                          )}
                        </div>
                      </div>
                      
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {profile.bio}
                        </p>
                      )}

                      {profile.skills && profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {profile.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => importDiscoveredProfile(profile)}
                          disabled={importingDiscovered === profile.name}
                        >
                          {importingDiscovered === profile.name ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-3 w-3 mr-1" />
                          )}
                          Import
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(profile.sourceUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {discovering && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium">Searching the web...</h3>
                <p className="text-muted-foreground text-center">
                  AI is discovering creator profiles. This may take a moment.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          {unclaimedProfiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No unclaimed profiles yet</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2">
                  Create profiles for industry professionals that they can claim and verify later.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unclaimedProfiles.map((profile) => (
                <Card key={profile.user_id} className="relative">
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-amber-500/20 text-amber-600"
                  >
                    Unclaimed
                  </Badge>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{profile.full_name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
                        {profile.location && (
                          <p className="text-xs text-muted-foreground">{profile.location}</p>
                        )}
                      </div>
                    </div>
                    
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant="outline" className="text-xs">
                        {profile.profile_source || 'admin'}
                      </Badge>
                      {profile.imported_from_url && (
                        <a 
                          href={profile.imported_from_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => copyClaimLink(profile.claim_token!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/profile/${profile.user_id}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          {claimRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No pending claims</h3>
                <p className="text-muted-foreground">
                  Claim requests will appear here for your review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {claimRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <h3 className="font-medium">
                        {(request.profiles as any)?.full_name || 'Unknown Profile'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Claimed by: {request.claimant_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{request.verification_method}</Badge>
                        {request.verification_proof && (
                          <a 
                            href={request.verification_proof} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View Proof
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleClaimRequest(request.id, false)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleClaimRequest(request.id, true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
