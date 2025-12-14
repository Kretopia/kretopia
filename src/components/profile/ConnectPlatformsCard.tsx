import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { 
  Music, 
  Youtube, 
  Instagram, 
  Film, 
  Disc3, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  RefreshCw,
  Unlink,
  Search,
  AlertCircle,
  Video
} from "lucide-react";

interface ConnectedPlatform {
  id: string;
  platform: string;
  platform_username: string;
  platform_data: any;
  verified_at: string;
  last_synced_at: string;
}

// Generate a cryptographically secure random state for CSRF protection
const generateOAuthState = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const PLATFORMS = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: Music,
    color: 'bg-green-500',
    description: 'Connect to verify streaming stats and import discography',
    requiresOAuth: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-500',
    description: 'Connect to verify subscriber count and import videos',
    requiresOAuth: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Connect to verify follower count',
    requiresOAuth: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: 'bg-gradient-to-r from-[#00f2ea] to-[#ff0050]',
    description: 'Connect to verify follower count and import videos',
    requiresOAuth: true,
  },
  {
    id: 'imdb',
    name: 'IMDB / TMDB',
    icon: Film,
    color: 'bg-yellow-500',
    description: 'Search and import your film/TV credits',
    requiresOAuth: false,
  },
  {
    id: 'discogs',
    name: 'Discogs',
    icon: Disc3,
    color: 'bg-orange-500',
    description: 'Search and import your music production credits',
    requiresOAuth: false,
  },
];

export function ConnectPlatformsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [processingCallback, setProcessingCallback] = useState(false);

  // Handle OAuth callback
  const handleOAuthCallback = useCallback(async (code: string, platform: string, state: string) => {
    // Validate state to prevent CSRF attacks
    const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch - possible CSRF attack');
      toast({
        title: "Security Error",
        description: "OAuth state validation failed. Please try connecting again.",
        variant: "destructive",
      });
      return;
    }

    // Clear the stored state
    sessionStorage.removeItem(`oauth_state_${platform}`);

    setProcessingCallback(true);
    setConnecting(platform);

    try {
      const redirectUri = `${window.location.origin}/settings?oauth_callback=${platform}`;
      
      const { data, error } = await supabase.functions.invoke('connect-platform', {
        body: {
          action: 'exchangeCode',
          platform,
          code,
          redirectUri,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connected!",
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} has been connected successfully`,
        });
        fetchConnectedPlatforms();
      } else {
        throw new Error(data.error || 'Failed to exchange code');
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to complete OAuth connection",
        variant: "destructive",
      });
    } finally {
      setProcessingCallback(false);
      setConnecting(null);
      // Clear URL parameters
      setSearchParams({});
    }
  }, [toast, setSearchParams]);

  useEffect(() => {
    if (user) {
      fetchConnectedPlatforms();
      
      // Check for OAuth callback parameters
      const oauthCallback = searchParams.get('oauth_callback');
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        toast({
          title: "Connection Denied",
          description: errorDescription || `${oauthCallback || 'Platform'} authorization was denied`,
          variant: "destructive",
        });
        setSearchParams({});
        return;
      }

      if (oauthCallback && code && state && !processingCallback) {
        handleOAuthCallback(code, oauthCallback, state);
      }
    }
  }, [user, searchParams, handleOAuthCallback, processingCallback]);

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

  const handleOAuthConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      // Generate and store state for CSRF protection
      const state = generateOAuthState();
      sessionStorage.setItem(`oauth_state_${platform}`, state);
      
      const redirectUri = `${window.location.origin}/settings?oauth_callback=${platform}`;
      
      const { data, error } = await supabase.functions.invoke('connect-platform', {
        body: {
          action: 'getAuthUrl',
          platform,
          redirectUri,
          state, // Pass state to be included in auth URL
        },
      });

      if (error) throw error;

      if (data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else if (data.error) {
        // Clear stored state if connection fails
        sessionStorage.removeItem(`oauth_state_${platform}`);
        toast({
          title: "Not Available",
          description: data.details || `${platform} integration is not configured yet`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('OAuth connect error:', error);
      // Clear stored state on error
      sessionStorage.removeItem(`oauth_state_${platform}`);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start connection",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleSearchConnect = async (platform: string) => {
    if (!searchName.trim()) return;
    
    setSearching(true);
    try {
      const functionName = platform === 'imdb' ? 'fetch-imdb-credits' : 'fetch-discogs-credits';
      const body = platform === 'imdb' 
        ? { personName: searchName }
        : { artistName: searchName };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Credits Imported!",
          description: `Found ${data.creditsImported} credits for "${searchName}"`,
        });
        setSearchDialogOpen(null);
        setSearchName('');
        fetchConnectedPlatforms();
      } else if (!data.personFound && !data.artistFound) {
        toast({
          title: "Not Found",
          description: `No results found for "${searchName}". Try a different name.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Search connect error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for credits",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleRefresh = async (platform: string) => {
    setConnecting(platform);
    try {
      const { data, error } = await supabase.functions.invoke('connect-platform', {
        body: {
          action: 'refresh',
          platform,
        },
      });

      if (error) throw error;

      toast({
        title: "Refreshed!",
        description: `${platform} data has been updated`,
      });
      fetchConnectedPlatforms();
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const { error } = await supabase.functions.invoke('connect-platform', {
        body: {
          action: 'disconnect',
          platform,
        },
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: `${platform} has been disconnected`,
      });
      fetchConnectedPlatforms();
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
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
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Connect & Verify Platforms
        </CardTitle>
        <CardDescription>
          Connect your accounts to auto-verify credentials and import your work credits
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
              className={`flex items-center justify-between p-4 rounded-lg border ${
                connected ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${platform.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{platform.name}</span>
                    {connected && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {connected && connectionData ? (
                    <div className="text-sm text-muted-foreground">
                      @{connectionData.platform_username}
                      {connectionData.platform_data?.followers && (
                        <span className="ml-2">
                          • {formatMetric(connectionData.platform_data.followers)} followers
                        </span>
                      )}
                      {connectionData.platform_data?.subscribers && (
                        <span className="ml-2">
                          • {formatMetric(connectionData.platform_data.subscribers)} subscribers
                        </span>
                      )}
                      {connectionData.platform_data?.likes && (
                        <span className="ml-2">
                          • {formatMetric(connectionData.platform_data.likes)} likes
                        </span>
                      )}
                      {connectionData.platform_data?.videoCount && (
                        <span className="ml-2">
                          • {connectionData.platform_data.videoCount} videos
                        </span>
                      )}
                      {connectionData.platform_data?.totalCredits && (
                        <span className="ml-2">
                          • {connectionData.platform_data.totalCredits} credits
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefresh(platform.id)}
                      disabled={connecting === platform.id}
                    >
                      {connecting === platform.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(platform.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </>
                ) : platform.requiresOAuth ? (
                  <Button
                    onClick={() => handleOAuthConnect(platform.id)}
                    disabled={connecting === platform.id}
                    size="sm"
                  >
                    {connecting === platform.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                ) : (
                  <Dialog open={searchDialogOpen === platform.id} onOpenChange={(open) => setSearchDialogOpen(open ? platform.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Search className="h-4 w-4 mr-2" />
                        Search & Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import {platform.name} Credits</DialogTitle>
                        <DialogDescription>
                          Enter your name as it appears on {platform.name} to search and import your credits
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>
                            {platform.id === 'imdb' ? 'Your Name (as on IMDB)' : 'Artist Name'}
                          </Label>
                          <Input
                            placeholder={platform.id === 'imdb' ? 'e.g., Christopher Nolan' : 'e.g., Daft Punk'}
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchConnect(platform.id)}
                          />
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            We'll search {platform.name} for your credits and import them to your profile. 
                            This helps verify your professional work history.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleSearchConnect(platform.id)}
                          disabled={searching || !searchName.trim()}
                          className="w-full"
                        >
                          {searching ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Search & Import Credits
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Connected platforms auto-update your profile with verified stats and credits.
            <br />
            <span className="text-primary">More platforms coming soon:</span> AllMusic, Grammy, SoundCloud, LinkedIn
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
