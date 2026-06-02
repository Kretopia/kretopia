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
        .select("user_id, full_name, avatar_url, mother_agency, model_unions, model_categories, model_stats, comp_card_layout, public_email, sub_roles")
        .eq("user_id", userId)
        .maybeSingle()
        .catch(() => ({ data: null } as any));

      let portfolio: any[] = [];
      const { data: pf } = await supabase
        .from("portfolio_items" as any)
        .select("id, url, image_url, thumbnail_url, order_index")
        .eq("user_id", userId)
        .order("order_index", { ascending: true })
        .limit(20)
        .catch(() => ({ data: [] } as any));
      if (Array.isArray(pf)) portfolio = pf;

      const layout: any = (p as any)?.comp_card_layout;
      let imgs: string[] = [];
      if (layout?.slots && Array.isArray(layout.slots)) {
        imgs = layout.slots
          .map((s: any) => {
            const item = portfolio.find((x: any) => x.id === s.portfolio_id);
            return item?.image_url || item?.url || item?.thumbnail_url || null;
          })
          .filter(Boolean) as string[];
      }
      if (imgs.length < 5) {
        const fallback = [
          (p as any)?.avatar_url,
          ...portfolio.map((x: any) => x.image_url || x.url || x.thumbnail_url),
        ].filter(Boolean) as string[];
        for (const u of fallback) {
          if (imgs.length >= 5) break;
          if (!imgs.includes(u)) imgs.push(u);
        }
      }
      setImages(imgs.slice(0, 5));
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
          contact={profile.public_email}
        />
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Powered by ThriveIN
        </div>
      </div>
    </div>
  );
}
