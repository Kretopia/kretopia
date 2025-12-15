import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Music, 
  Film, 
  Disc3, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  AlertCircle,
  Edit,
  Sparkles,
  User
} from "lucide-react";

interface ConnectedPlatform {
  id: string;
  platform: string;
  platform_username: string;
  platform_data: any;
  verified_at: string;
  last_synced_at: string;
}

interface SearchResult {
  id: string;
  name: string;
  image?: string;
  details?: string;
  url?: string;
}

// Only platforms that work without OAuth
const PLATFORMS = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: Music,
    color: 'bg-green-500',
    description: 'Search for your Spotify artist profile to import music & stats',
    searchPlaceholder: 'Search artist name (e.g., "Ethan Young")',
    searchType: 'spotify' as const,
  },
  {
    id: 'imdb',
    name: 'IMDB / TMDB',
    icon: Film,
    color: 'bg-yellow-500',
    description: 'Search and import your film/TV credits',
    searchPlaceholder: 'Your name as it appears on IMDB',
    searchType: 'imdb' as const,
  },
  {
    id: 'discogs',
    name: 'Discogs',
    icon: Disc3,
    color: 'bg-orange-500',
    description: 'Search and import your music production credits',
    searchPlaceholder: 'Your artist/producer name',
    searchType: 'discogs' as const,
  },
];

export function PlatformConnectionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConnectedPlatforms();
    }
  }, [user]);

  const fetchConnectedPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('connected_platforms')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setConnectedPlatforms(data || []);
    } catch (error) {
      console.error('Error fetching connected platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (platform: string) => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      if (platform === 'spotify') {
        // Use Spotify API to search for artists
        const response = await fetch(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`
        );
        
        // For Spotify, we'll do a different approach - search via our backend
        const { data, error } = await supabase.functions.invoke('connect-platform', {
          body: {
            action: 'searchArtist',
            platform: 'spotify',
            query: searchQuery,
          },
        });

        if (error) throw error;
        
        if (data?.results) {
          setSearchResults(data.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            image: r.images?.[0]?.url || r.image,
            details: r.genres?.join(', ') || `${r.followers?.total?.toLocaleString() || 0} followers`,
            url: r.external_urls?.spotify || r.url,
          })));
        } else {
          // Fallback: Just use the search query as-is
          setSearchResults([{
            id: searchQuery.toLowerCase().replace(/\s+/g, '-'),
            name: searchQuery,
            details: 'Enter your Spotify artist URL to verify',
          }]);
        }
      } else if (platform === 'imdb') {
        const { data, error } = await supabase.functions.invoke('fetch-imdb-credits', {
          body: { 
            personName: searchQuery,
            searchOnly: true 
          },
        });

        if (error) throw error;
        
        if (data?.searchResults) {
          setSearchResults(data.searchResults.map((r: any) => ({
            id: r.id,
            name: r.name,
            image: r.profile_path ? `https://image.tmdb.org/t/p/w92${r.profile_path}` : undefined,
            details: r.known_for_department || 'Person',
            url: `https://www.themoviedb.org/person/${r.id}`,
          })));
        }
      } else if (platform === 'discogs') {
        const { data, error } = await supabase.functions.invoke('fetch-discogs-credits', {
          body: { 
            artistName: searchQuery,
            searchOnly: true 
          },
        });

        if (error) throw error;
        
        if (data?.searchResults) {
          setSearchResults(data.searchResults.map((r: any) => ({
            id: r.id?.toString(),
            name: r.title || r.name,
            image: r.thumb || r.cover_image,
            details: r.type || 'Artist',
            url: r.resource_url,
          })));
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Unable to search. Try entering the URL directly.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAndImport = async (platform: string, result: SearchResult) => {
    setSelectedResult(result);
    setImporting(true);
    
    try {
      if (platform === 'spotify') {
        // Fetch via Spotify oEmbed
        const spotifyUrl = result.url || `https://open.spotify.com/artist/${result.id}`;
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
        
        const response = await fetch(oembedUrl);
        if (!response.ok) throw new Error('Could not fetch Spotify data');
        
        const oembedData = await response.json();
        
        // Save to connected_platforms
        const { error } = await supabase
          .from('connected_platforms')
          .upsert({
            user_id: user?.id,
            platform: 'spotify',
            platform_username: result.name,
            platform_user_id: result.id,
            platform_data: {
              artistId: result.id,
              spotifyUrl: spotifyUrl,
              thumbnailUrl: oembedData.thumbnail_url || result.image,
              embedHtml: oembedData.html,
              genres: result.details,
            },
            verified_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,platform',
          });

        if (error) throw error;

        // Import verified credits
        await importSpotifyCredits(result.id, result.name);
        
        toast({
          title: "Spotify Connected!",
          description: `Added ${result.name} to your profile with music credits`,
        });
      } else if (platform === 'imdb') {
        const { data, error } = await supabase.functions.invoke('fetch-imdb-credits', {
          body: { 
            personId: result.id,
            personName: result.name 
          },
        });

        if (error) throw error;
        
        toast({
          title: "IMDB Credits Imported!",
          description: `Found ${data?.creditsImported || 0} credits for ${result.name}`,
        });
      } else if (platform === 'discogs') {
        const { data, error } = await supabase.functions.invoke('fetch-discogs-credits', {
          body: { 
            artistId: result.id,
            artistName: result.name 
          },
        });

        if (error) throw error;
        
        toast({
          title: "Discogs Credits Imported!",
          description: `Found ${data?.creditsImported || 0} credits for ${result.name}`,
        });
      }

      setSearchDialogOpen(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      fetchConnectedPlatforms();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import credits",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const importSpotifyCredits = async (artistId: string, artistName: string) => {
    try {
      // Get Spotify artist albums via our edge function
      const { data, error } = await supabase.functions.invoke('connect-platform', {
        body: {
          action: 'importSpotifyCredits',
          artistId,
          artistName,
        },
      });

      if (error) {
        console.error('Spotify credits import error:', error);
      }
    } catch (e) {
      console.error('Spotify import error:', e);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      // Remove from connected_platforms
      const { error: platformError } = await supabase
        .from('connected_platforms')
        .delete()
        .eq('user_id', user?.id)
        .eq('platform', platform);

      if (platformError) throw platformError;

      // Remove verified credits from this platform
      const { error: creditsError } = await supabase
        .from('verified_credits')
        .delete()
        .eq('user_id', user?.id)
        .eq('source', platform);

      toast({
        title: "Disconnected",
        description: `${platform} has been removed from your profile`,
      });
      fetchConnectedPlatforms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (platformId: string) => {
    // Open search dialog to select a new profile
    setSearchDialogOpen(platformId);
    const connection = connectedPlatforms.find(p => p.platform === platformId);
    if (connection) {
      setSearchQuery(connection.platform_username);
    }
  };

  const isConnected = (platformId: string) => {
    return connectedPlatforms.some(p => p.platform === platformId);
  };

  const getConnectionData = (platformId: string) => {
    return connectedPlatforms.find(p => p.platform === platformId);
  };

  const formatMetric = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Import & Verify Credits
        </CardTitle>
        <CardDescription>
          Search your name on major platforms to auto-import and verify your work credits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id);
          const connectionData = getConnectionData(platform.id);
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className={`p-4 rounded-lg border transition-colors ${
                connected ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${platform.color} text-white shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium">{platform.name}</span>
                    {connected && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  {connected && connectionData ? (
                    <p className="text-sm text-muted-foreground">
                      {connectionData.platform_username}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {platform.description}
                    </p>
                  )}
                  
                  {/* Action buttons - below content on mobile */}
                  <div className="flex items-center gap-2 mt-3">
                    {connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(platform.id)}
                          className="gap-1.5"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-destructive hover:text-destructive gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Dialog 
                        open={searchDialogOpen === platform.id} 
                        onOpenChange={(open) => {
                          setSearchDialogOpen(open ? platform.id : null);
                          if (!open) {
                            setSearchQuery('');
                            setSearchResults([]);
                            setSelectedResult(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="default" className="gap-2">
                            <Search className="h-4 w-4" />
                            Search & Import
                          </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${platform.color.replace('bg-', 'text-').replace('-500', '-600')}`} />
                          Search {platform.name}
                        </DialogTitle>
                        <DialogDescription>
                          Search for your profile, then select the correct one to import credits
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 pt-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder={platform.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(platform.id)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={() => handleSearch(platform.id)}
                            disabled={searching || !searchQuery.trim()}
                          >
                            {searching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {searchResults.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                              Select your profile:
                            </Label>
                            <ScrollArea className="h-[280px] rounded-md border">
                              <div className="p-2 space-y-2">
                                {searchResults.map((result) => (
                                  <div
                                    key={result.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      selectedResult?.id === result.id 
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                        : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => setSelectedResult(result)}
                                  >
                                    {result.image ? (
                                      <img
                                        src={result.image}
                                        alt={result.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                        <User className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{result.name}</p>
                                      {result.details && (
                                        <p className="text-sm text-muted-foreground truncate">
                                          {result.details}
                                        </p>
                                      )}
                                    </div>
                                    {result.url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <a href={result.url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {searching && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        )}

                        {!searching && searchQuery && searchResults.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No results found for "{searchQuery}"
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Try a different spelling or your full name
                            </p>
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          onClick={() => selectedResult && handleSelectAndImport(platform.id, selectedResult)}
                          disabled={!selectedResult || importing}
                          className="w-full"
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Importing Credits...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Import {selectedResult?.name || 'Selected Profile'}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Imported credits appear in your <strong>Work</strong> section and boost your verification score.
              You can edit or remove connections anytime.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
