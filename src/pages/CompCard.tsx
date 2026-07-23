import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CompCardPreview } from "@/components/passport/model/CompCardPreview";
import { BrandLoader } from "@/components/brand/BrandDots";
import { Helmet } from "react-helmet-async";

/**
 * Public, chrome-free comp card view.
 * Route: /comp/:userId
 * Exactly what a model can DM/email a casting director.
 */
export default function CompCard() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, portfolio_links, mother_agency, model_unions, model_categories, model_stats, comp_card_layout, sub_roles")
        .eq("user_id", userId)
        .maybeSingle();

      const layout: any = (p as any)?.comp_card_layout;
      const imgs: string[] = Array.from({ length: 5 }, () => "") as string[];
      if (layout?.slots && Array.isArray(layout.slots)) {
        layout.slots.forEach((s: any) => {
          if (typeof s?.slot_index === "number" && s.image_url && s.slot_index < 5) {
            imgs[s.slot_index] = s.image_url;
          }
        });
      }
      // Fill any empty slots with avatar + portfolio_links fallback
      const fallback = [(p as any)?.avatar_url, ...((p as any)?.portfolio_links || [])].filter(Boolean) as string[];
      let fi = 0;
      for (let i = 0; i < 5; i++) {
        if (!imgs[i]) {
          while (fi < fallback.length && imgs.includes(fallback[fi])) fi++;
          if (fi < fallback.length) imgs[i] = fallback[fi++];
        }
      }
      setImages(imgs.filter(Boolean).slice(0, 5));
      setProfile(p);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-background"><BrandLoader /></div>;
  if (!profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">Comp card not found</div>;

  const title = `${profile.full_name || "Model"} — Comp Card`;
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Comp card for ${profile.full_name || "model"}`} />
      </Helmet>
      <div className="max-w-md mx-auto">
        <CompCardPreview
          name={profile.full_name || "Model"}
          agency={profile.mother_agency}
          unions={profile.model_unions}
          categories={profile.model_categories}
          stats={profile.model_stats}
          images={images}
          contact={null}
        />
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Powered by Kretopia
        </div>
      </div>
    </div>
  );
}
