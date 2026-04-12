import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Resolves /:username to the creator's site.
 * Looks up the username in profiles, then renders CreatorSite logic.
 */
const CreatorSiteByUsername = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      if (!username) {
        navigate("/", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, site_enabled, subscription_tier")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (!profile) {
        // Not a valid username — let the app handle 404
        navigate("/", { replace: true });
        return;
      }

      const proTiers = ["pro", "creator_pro", "founder"];
      const hasPro = proTiers.includes(profile.subscription_tier || "");

      if (profile.site_enabled && hasPro) {
        // Redirect to the creator site route
        navigate(`/site/${profile.user_id}`, { replace: true });
      } else {
        // Redirect to regular profile
        navigate(`/profile/${profile.user_id}`, { replace: true });
      }
    };

    resolve();
  }, [username, navigate]);

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white/50" />
    </div>
  );
};

export default CreatorSiteByUsername;
