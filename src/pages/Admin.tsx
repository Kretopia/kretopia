import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, ShieldCheck, Settings, UserPlus, Send, Loader2, Leaf, CheckCircle, AlertCircle, Bot, Sparkles, Search } from "lucide-react";
import { UsersTab } from "@/components/admin/UsersTab";
import { VerificationTab } from "@/components/admin/VerificationTab";
import { UnclaimedProfilesTab } from "@/components/admin/UnclaimedProfilesTab";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OdosImportResult {
  name: string;
  status: 'imported' | 'enriched' | 'duplicate' | 'error';
  profileId?: string;
  credits?: number;
  awards?: number;
  message?: string;
}

interface OdosImportSummary {
  totalMembers: number;
  imported: number;
  enriched: number;
  duplicates: number;
  errors: number;
}

interface AIDiscoveryResult {
  name: string;
  status: 'imported' | 'duplicate' | 'skipped' | 'error';
  role?: string;
  error?: string;
  enriched?: boolean;
}

interface AIDiscoverySummary {
  discovered: number;
  processed: number;
  imported: number;
  enriched: number;
  duplicates: number;
  errors: number;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [importingOdos, setImportingOdos] = useState(false);
  const [odosResults, setOdosResults] = useState<OdosImportResult[] | null>(null);
  const [odosSummary, setOdosSummary] = useState<OdosImportSummary | null>(null);
  
  // AI Discovery state
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<AIDiscoveryResult[] | null>(null);
  const [discoverySummary, setDiscoverySummary] = useState<AIDiscoverySummary | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        navigate("/circle");
        return;
      }

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/circle");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while checking permissions",
        variant: "destructive",
      });
      navigate("/circle");
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcastEmail = async () => {
    setSendingBroadcast(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast-email');
      
      if (error) throw error;
      
      toast({
        title: "Broadcast Sent!",
        description: `Successfully sent to ${data?.sent || 0} users. ${data?.failed || 0} failed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast email",
        variant: "destructive",
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const importOdosMembers = async () => {
    setImportingOdos(true);
    setOdosResults(null);
    setOdosSummary(null);
    
    try {
      toast({
        title: "ODOS Import Started",
        description: "Scraping members and enriching with AI... This may take a few minutes.",
      });

      const { data, error } = await supabase.functions.invoke('import-odos-members');
      
      if (error) throw error;
      
      if (data?.results) {
        setOdosResults(data.results);
        setOdosSummary(data.summary);
      }
      
      toast({
        title: "ODOS Import Complete! 🌿",
        description: `Imported ${data?.summary?.imported || 0} members, ${data?.summary?.enriched || 0} enriched with credits/awards.`,
      });
    } catch (error: any) {
      console.error("ODOS import error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import ODOS members",
        variant: "destructive",
      });
    } finally {
      setImportingOdos(false);
    }
  };

  const runAIDiscovery = async (maxProfiles = 20) => {
    setRunningDiscovery(true);
    setDiscoveryResults(null);
    setDiscoverySummary(null);
    
    try {
      toast({
        title: "🤖 AI Discovery Agent Started",
        description: "Searching for authentic creatives across the web... This may take a few minutes.",
      });

      const { data, error } = await supabase.functions.invoke('auto-discover-creatives', {
        body: { maxProfiles },
      });
      
      if (error) throw error;
      
      if (data?.results) {
        setDiscoveryResults(data.results);
        setDiscoverySummary(data.summary);
      }
      
      toast({
        title: "AI Discovery Complete! 🎯",
        description: `Discovered ${data?.summary?.discovered || 0} creatives, imported ${data?.summary?.imported || 0} new profiles.`,
      });
    } catch (error: any) {
      console.error("AI Discovery error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to run AI discovery",
        variant: "destructive",
      });
    } finally {
      setRunningDiscovery(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="unclaimed" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Unclaimed</span>
          </TabsTrigger>
          <TabsTrigger value="verifications" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Verify</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 sm:mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="unclaimed" className="mt-4 sm:mt-6">
          <UnclaimedProfilesTab />
        </TabsContent>

        <TabsContent value="verifications" className="mt-4 sm:mt-6">
          <VerificationTab />
        </TabsContent>

        <TabsContent value="system" className="mt-4 sm:mt-6">
          <div className="space-y-6">
            {/* ODOS Import Card */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Leaf className="h-5 w-5" />
                  ODOS Community Import
                </CardTitle>
                <CardDescription>
                  Scrape ODOS members page, enrich profiles with AI (IMDb, Wikipedia, etc.), and tag with ODOS badge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={importOdosMembers} 
                  disabled={importingOdos}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  {importingOdos ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing ODOS Members...
                    </>
                  ) : (
                    <>
                      <Leaf className="h-4 w-4 mr-2" />
                      Import ODOS Members
                    </>
                  )}
                </Button>

                {/* Summary */}
                {odosSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold">{odosSummary.totalMembers}</div>
                      <div className="text-xs text-muted-foreground">Total Found</div>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{odosSummary.imported}</div>
                      <div className="text-xs text-muted-foreground">Imported</div>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{odosSummary.enriched}</div>
                      <div className="text-xs text-muted-foreground">Enriched</div>
                    </div>
                    <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{odosSummary.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicates</div>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{odosSummary.errors}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>
                )}

                {/* Results List */}
                {odosResults && odosResults.length > 0 && (
                  <ScrollArea className="h-64 border rounded-lg p-2">
                    <div className="space-y-2">
                      {odosResults.map((result, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'enriched' && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                            {result.status === 'imported' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {result.status === 'duplicate' && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            {result.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">{result.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.credits && result.credits > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {result.credits} credits
                              </Badge>
                            )}
                            {result.awards && result.awards > 0 && (
                              <Badge variant="secondary" className="text-xs bg-amber-500/20">
                                {result.awards} awards
                              </Badge>
                            )}
                            <Badge 
                              variant={result.status === 'error' ? 'destructive' : 'outline'}
                              className={
                                result.status === 'enriched' ? 'bg-primary/20 text-primary' :
                                result.status === 'imported' ? 'bg-green-500/20 text-green-600' :
                                result.status === 'duplicate' ? 'bg-yellow-500/20 text-yellow-600' :
                                ''
                              }
                            >
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* AI Discovery Agent Card */}
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Bot className="h-5 w-5" />
                  AI Creative Discovery Agent
                </CardTitle>
                <CardDescription>
                  Autonomous AI that discovers authentic creatives from industry news, award shows, and platforms (runs twice daily automatically)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => runAIDiscovery(10)} 
                    disabled={runningDiscovery}
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-500/10"
                  >
                    {runningDiscovery ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Quick Run (10)
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => runAIDiscovery(20)} 
                    disabled={runningDiscovery}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {runningDiscovery ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Standard Run (20)
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => runAIDiscovery(50)} 
                    disabled={runningDiscovery}
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-500/10"
                  >
                    {runningDiscovery ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Deep Run (50)
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium mb-1">Discovery Sources:</p>
                  <p>• Industry News (Billboard, Variety, Hollywood Reporter)</p>
                  <p>• Award Shows (Grammy, Oscar, Emmy nominees)</p>
                  <p>• Platforms (IMDb, Spotify, Behance, Dribbble)</p>
                  <p>• Trending Creatives & Breakout Artists</p>
                </div>

                {/* Summary */}
                {discoverySummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4">
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold">{discoverySummary.discovered}</div>
                      <div className="text-xs text-muted-foreground">Discovered</div>
                    </div>
                    <div className="bg-purple-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{discoverySummary.processed}</div>
                      <div className="text-xs text-muted-foreground">Processed</div>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{discoverySummary.imported}</div>
                      <div className="text-xs text-muted-foreground">Imported</div>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{discoverySummary.enriched}</div>
                      <div className="text-xs text-muted-foreground">Enriched</div>
                    </div>
                    <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{discoverySummary.duplicates}</div>
                      <div className="text-xs text-muted-foreground">Duplicates</div>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{discoverySummary.errors}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>
                )}

                {/* Results List */}
                {discoveryResults && discoveryResults.length > 0 && (
                  <ScrollArea className="h-64 border rounded-lg p-2">
                    <div className="space-y-2">
                      {discoveryResults.map((result, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'imported' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {result.status === 'duplicate' && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            {result.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <span className="text-sm font-medium">{result.name}</span>
                              {result.role && (
                                <span className="text-xs text-muted-foreground ml-2">({result.role})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.enriched && (
                              <Badge variant="secondary" className="text-xs bg-purple-500/20">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Enriched
                              </Badge>
                            )}
                            <Badge 
                              variant={result.status === 'error' ? 'destructive' : 'outline'}
                              className={
                                result.status === 'imported' ? 'bg-green-500/20 text-green-600' :
                                result.status === 'duplicate' ? 'bg-yellow-500/20 text-yellow-600' :
                                ''
                              }
                            >
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Broadcast Email Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Broadcast Email
                </CardTitle>
                <CardDescription>
                  Send platform updates or announcements to all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={sendBroadcastEmail} 
                  disabled={sendingBroadcast}
                  className="w-full sm:w-auto"
                >
                  {sendingBroadcast ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Broadcast to All Users
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
