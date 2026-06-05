import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Palette, Plus, Pin, PinOff, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Props {
  projectId: string;
}

interface VaultRow {
  id: string;
  name: string;
  logo_url: string | null;
  palette: string[];
  project_id: string | null;
  is_default: boolean;
}

/**
 * Compact chip shown in the Studio Room that reveals which brand Thrive
 * will use when it generates a doc. Click → popover with pin/unpin to this
 * Studio + a deep link into the full editor.
 */
export function BrandVaultChip({ projectId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vault, setVault] = useState<VaultRow | null>(null);
  const [defaultVault, setDefaultVault] = useState<VaultRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("brand_vaults")
      .select("id, name, logo_url, palette, project_id, is_default")
      .eq("user_id", user.id);
    const rows = (data || []) as any[];
    const normalize = (r: any): VaultRow => ({
      id: r.id, name: r.name, logo_url: r.logo_url,
      palette: Array.isArray(r.palette) ? r.palette : [],
      project_id: r.project_id, is_default: r.is_default,
    });
    const pinned = rows.find((r) => r.project_id === projectId);
    const def = rows.find((r) => !r.project_id && r.is_default);
    setVault(pinned ? normalize(pinned) : def ? normalize(def) : null);
    setDefaultVault(def ? normalize(def) : null);
  };

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    load().catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projectId]);

  const isPinned = !!vault?.project_id;

  const pinToStudio = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (!defaultVault) {
        // No default exists — send user to editor scoped to project.
        window.location.href = `/brand-vault?project=${projectId}`;
        return;
      }
      // Clone default vault → project-scoped vault.
      const { error } = await supabase.from("brand_vaults").insert({
        user_id: user.id,
        project_id: projectId,
        is_default: false,
        name: `${defaultVault.name} · Studio`,
        logo_url: defaultVault.logo_url,
        palette: defaultVault.palette,
      });
      if (error) throw error;
      toast({ title: "Pinned to this Studio", description: "Thrive will use this brand for every doc here." });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't pin", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const unpinFromStudio = async () => {
    if (!vault?.project_id) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("brand_vaults").delete().eq("id", vault.id);
      if (error) throw error;
      toast({ title: "Unpinned", description: "Falling back to your default brand." });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't unpin", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Render: no vault yet → "Add brand" CTA.
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
    <Popover>
      <PopoverTrigger asChild>
        <button
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
          {isPinned && (
            <span className="text-[9px] uppercase tracking-wider text-primary font-bold ml-0.5">studio</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Active brand</p>
          <p className="text-sm font-medium truncate">{vault.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {isPinned ? "Pinned to this Studio." : "Your default — used everywhere."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {isPinned ? (
            <Button size="sm" variant="outline" onClick={unpinFromStudio} disabled={busy} className="justify-start gap-1.5 h-8 text-xs">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PinOff className="h-3 w-3" />}
              Unpin from this Studio
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={pinToStudio} disabled={busy} className="justify-start gap-1.5 h-8 text-xs">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pin className="h-3 w-3" />}
              Pin a Studio version
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild className="justify-start gap-1.5 h-8 text-xs">
            <Link to={isPinned ? `/brand-vault?project=${projectId}` : `/brand-vault`}>
              <Pencil className="h-3 w-3" /> Edit brand
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
