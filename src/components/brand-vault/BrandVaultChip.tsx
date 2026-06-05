import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Palette, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  projectId: string;
}

/**
 * Compact chip shown in the Studio Room that reveals which brand Thrive
 * will use when it generates a doc. Tap → opens the editor scoped to this
 * Studio (or the user's default if no per-Studio brand exists yet).
 */
export function BrandVaultChip({ projectId }: Props) {
  const { user } = useAuth();
  const [vault, setVault] = useState<{ id: string; name: string; logo_url: string | null; palette: string[]; project_id: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Prefer project-pinned vault, fall back to user default
      const { data } = await supabase
        .from("brand_vaults")
        .select("id, name, logo_url, palette, project_id, is_default")
        .eq("user_id", user.id)
        .or(`project_id.eq.${projectId},and(project_id.is.null,is_default.eq.true)`)
        .order("project_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setVault({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          palette: Array.isArray(data.palette) ? (data.palette as string[]) : [],
          project_id: data.project_id,
        });
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, projectId]);

  const href = vault?.project_id
    ? `/brand-vault?project=${projectId}`
    : vault
    ? `/brand-vault`
    : `/brand-vault?project=${projectId}`;

  if (!vault) {
    return (
      <Link
        to={`/brand-vault?project=${projectId}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-border text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
      >
        <Plus className="h-3 w-3" />
        Add brand
      </Link>
    );
  }

  return (
    <Link
      to={href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary/50 transition text-[11px] group"
      title={`Thrive will use this brand: ${vault.name}`}
    >
      {vault.logo_url ? (
        <img src={vault.logo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
      ) : (
        <Palette className="h-3 w-3 text-primary" />
      )}
      <span className="font-medium truncate max-w-[100px]">{vault.name}</span>
      {vault.palette.slice(0, 3).map((c, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full border border-border/50"
          style={{ backgroundColor: c }}
        />
      ))}
      {vault.project_id ? (
        <span className="text-[9px] uppercase tracking-wider text-primary font-bold ml-0.5">studio</span>
      ) : null}
    </Link>
  );
}
