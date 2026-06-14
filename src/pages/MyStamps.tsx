import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowLeft, Search } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PassportAnchorStrip } from "@/components/passport/PassportAnchorStrip";
import { UnifiedWorkHistory } from "@/components/profile/UnifiedWorkHistory";

/**
 * /credits/mine — the user's personal Stamps page.
 * Split out of /credits (public search) — Muso/IMDb-style:
 * /credits = search & discover, /credits/mine = your work.
 */
const MyStamps = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

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
        <title>My Stamps — Verified Credits | ThriveIN</title>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/credits")}
              className="gap-1.5 shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
          </div>
        </div>


        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <UnifiedWorkHistory userId={userId} isOwnProfile={true} onRefresh={() => {}} />
        </div>
      </div>
    </>
  );
};

export default MyStamps;
