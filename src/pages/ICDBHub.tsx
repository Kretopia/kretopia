import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Database, Fingerprint, Building2, Link2, BookOpen, GitBranch, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreatorIDCard } from "@/components/icdb/CreatorIDCard";
import { CreditEmbedWidget } from "@/components/icdb/CreditEmbedWidget";
import { CreditGraph } from "@/components/icdb/CreditGraph";
import { CrossPlatformImport } from "@/components/icdb/CrossPlatformImport";
import { RoleTaxonomy } from "@/components/icdb/RoleTaxonomy";
import { BulkProjectSubmission } from "@/components/icdb/BulkProjectSubmission";

const ICDBHub = () => {
  const [tab, setTab] = useState<string>("id");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [creditCount, setCreditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [profileRes, creditRes] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role, icdb_creator_id, verification_tier').eq('user_id', user.id).single(),
        supabase.from('credits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setProfile(profileRes.data);
      setCreditCount(creditRes.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>ThriveCredits — Your Verified Creative History | ThriveIN</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">ThriveCredits</h1>
                <p className="text-[11px] text-muted-foreground">Your verified creative history — portable, permanent, professional</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate('/credits')}>
                <Search className="h-3 w-3" /> Browse Records
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate('/credits/discover')}>
                <Database className="h-3 w-3" /> AI Discovery
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-3">
          <div className="overflow-x-auto no-scrollbar">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="id" className="text-[11px] gap-1 whitespace-nowrap">
                  <Fingerprint className="h-3 w-3" /> My ID
                </TabsTrigger>
                <TabsTrigger value="graph" className="text-[11px] gap-1 whitespace-nowrap">
                  <GitBranch className="h-3 w-3" /> Graph
                </TabsTrigger>
                <TabsTrigger value="import" className="text-[11px] gap-1 whitespace-nowrap">
                  <Link2 className="h-3 w-3" /> Import
                </TabsTrigger>
                <TabsTrigger value="embed" className="text-[11px] gap-1 whitespace-nowrap">
                  <Database className="h-3 w-3" /> Embed
                </TabsTrigger>
                <TabsTrigger value="taxonomy" className="text-[11px] gap-1 whitespace-nowrap">
                  <BookOpen className="h-3 w-3" /> Roles
                </TabsTrigger>
                <TabsTrigger value="submit" className="text-[11px] gap-1 whitespace-nowrap">
                  <Upload className="h-3 w-3" /> Submit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="container mx-auto px-4 py-4">
          {tab === "id" && currentUserId && profile && (
            <div className="space-y-4">
              <CreatorIDCard
                creatorId={profile.icdb_creator_id || 'Generating...'}
                fullName={profile.full_name || 'Unknown'}
                role={profile.role}
                avatarUrl={profile.avatar_url}
                verificationTier={profile.verification_tier}
                creditCount={creditCount}
              />
              <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                <h3 className="text-sm font-semibold"><h3 className="text-sm font-semibold">What is your ThriveCredits ID?</h3></h3>
                <p className="text-xs text-muted-foreground">
                  Your unique, portable identity across the creative industry. Use it in contracts, 
                  bios, and platforms to link back to your verified creative history. Think of it as 
                  your creative passport — one ID that proves who you are and what you've built, 
                  trusted by labels, agencies, and brands worldwide.
                </p>
              </div>
            </div>
          )}

          {tab === "graph" && currentUserId && profile && (
            <CreditGraph
              userId={currentUserId}
              userName={profile.full_name || 'Unknown'}
              avatarUrl={profile.avatar_url}
            />
          )}

          {tab === "import" && currentUserId && (
            <CrossPlatformImport currentUserId={currentUserId} />
          )}

          {tab === "embed" && currentUserId && profile && (
            <CreditEmbedWidget
              creatorId={profile.icdb_creator_id || currentUserId}
              fullName={profile.full_name || 'Unknown'}
            />
          )}

          {tab === "taxonomy" && (
            <RoleTaxonomy />
          )}

          {tab === "submit" && currentUserId && (
            <BulkProjectSubmission currentUserId={currentUserId} />
          )}
        </div>
      </div>
    </>
  );
};

export default ICDBHub;
