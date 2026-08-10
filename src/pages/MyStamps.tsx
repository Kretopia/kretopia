import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowLeft, Search, Code2 } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PassportAnchorStrip } from "@/components/passport/PassportAnchorStrip";
import { UnifiedWorkHistory } from "@/components/profile/UnifiedWorkHistory";
import { EmbeddableCreditsWidget } from "@/components/profile/EmbeddableCreditsWidget";

/**
 * /credits/mine — the user's personal Stamps page.
 * Split out of /credits (public search) — Muso/IMDb-style:
 * /credits = search & discover, /credits/mine = your work.
 */
interface EmbedData {
  displayName: string;
  thriveId?: string;
  creditCount: number;
  topCredits: Array<{ project_name: string; role: string; verification_status?: string }>;
}

const MyStamps = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: profile }, { data: topCredits }, { count }] = await Promise.all([
        supabase.from("profiles").select("full_name, icdb_creator_id").eq("user_id", userId).maybeSingle(),
        supabase
          .from("credits")
          .select("project_name, role, verification_status")
          .eq("user_id", userId)
          .order("verification_status", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setEmbedData({
        displayName: profile?.full_name || "Creator",
        thriveId: profile?.icdb_creator_id || undefined,
        creditCount: count || 0,
        topCredits: topCredits || [],
      });
    })();
  }, [userId]);

  if (userId === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (userId === null) {
    return <Navigate to="/auth?redirect=/credits/mine" replace />;
  }

  return (
    <>
      <Helmet>
        <title>My Stamps — Verified Credits | Kretopia</title>
        <meta name="description" content="Your verified Stamps — the credits on your Creative Passport." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 pt-3">
          <button
            type="button"
            onClick={() => navigate("/credits")}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Credits
          </button>

          <PassportAnchorStrip className="mt-2" />

          <div className="flex items-center justify-between mt-4 mb-2 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Creative Passport</p>
              <h1 className="text-2xl font-black tracking-[-0.02em]">My Stamps</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmbedOpen(true)}
                className="gap-1.5"
              >
                <Code2 className="h-3.5 w-3.5" />
                Embed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/credits")}
                className="gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </div>
        </div>


        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <UnifiedWorkHistory userId={userId} isOwnProfile={true} onRefresh={() => {}} />
        </div>
      </div>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Embed your Stamps</DialogTitle>
          </DialogHeader>
          {embedData && (
            <EmbeddableCreditsWidget
              userId={userId}
              displayName={embedData.displayName}
              thriveId={embedData.thriveId}
              creditCount={embedData.creditCount}
              topCredits={embedData.topCredits}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyStamps;
