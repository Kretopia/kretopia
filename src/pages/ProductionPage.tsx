import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ShieldCheck, MapPin, CalendarDays, Building2,
  ExternalLink, Users, UserPlus, Loader2, Globe, Music, Film,
  CheckCircle2, Sparkles, Database, Link2, Plus, Camera, Palette,
  Megaphone, PartyPopper, ChevronDown, ChevronUp,
} from "lucide-react";
import { AuthPrompt, useAuthPrompt } from "@/components/AuthPrompt";

interface AIRole {
  role: string;
  name: string | null;
  department?: string;
}

interface ProductionData {
  name: string;
  type: string;
  year: number | null;
  industry: string;
  description: string;
  platform: string | null;
  location: string | null;
  client_brand: string | null;
  external_url: string | null;
  image_url: string | null;
  departments: { name: string; roles: AIRole[] }[];
  total_roles: number;
  source: string;
}

// Platform credit from our DB
interface PlatformRole {
  id: string;
  role: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: string | null;
}

const INDUSTRY_ICONS: Record<string, any> = {
  Music: Music,
  Film: Film,
  "Film & TV": Film,
  Fashion: Palette,
  Events: PartyPopper,
  Advertising: Megaphone,
  Photography: Camera,
};

const ProductionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open: authOpen, setOpen: setAuthOpen, requireAuth } = useAuthPrompt();

  const projectName = searchParams.get("name") || "";
  const [loading, setLoading] = useState(true);
  const [production, setProduction] = useState<ProductionData | null>(null);
  const [platformRoles, setPlatformRoles] = useState<PlatformRole[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState("");

  const fetchProduction = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);

    try {
      // 1. Fetch platform credits for this project
      const { data: credits } = await supabase
        .from("credits")
        .select("id, role, user_id, verification_status")
        .ilike("project_name", projectName)
        .order("role");

      // Fetch profiles for credited users
      const userIds = [...new Set((credits || []).map(c => c.user_id))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        profiles?.forEach(p => profileMap.set(p.user_id, p));
      }

      const mappedPlatformRoles: PlatformRole[] = (credits || []).map(c => ({
        id: c.id,
        role: c.role,
        user_id: c.user_id,
        full_name: profileMap.get(c.user_id)?.full_name || null,
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
        verification_status: c.verification_status,
      }));
      setPlatformRoles(mappedPlatformRoles);

      // 2. Use AI to generate full production details + roles
      const { data, error } = await supabase.functions.invoke("production-detail", {
        body: { 
          project_name: projectName,
          existing_roles: mappedPlatformRoles.map(r => r.role),
        },
      });

      if (error) throw error;
      if (data?.production) {
        setProduction(data.production);
        // Auto-expand first 2 departments
        const first2 = (data.production.departments || []).slice(0, 2).map((d: any) => d.name);
        setExpandedDepts(new Set(first2));
      }
    } catch (err) {
      console.error("Failed to load production:", err);
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => { fetchProduction(); }, [fetchProduction]);

  const handleClaim = async (roleName: string) => {
    if (!user) {
      requireAuth("claim this credit");
      return;
    }
    try {
      await supabase.from("credits").insert({
        user_id: user.id,
        project_name: projectName,
        role: roleName,
        year: production?.year,
        platform: production?.platform,
        location: production?.location,
        client_brand: production?.client_brand,
        project_type: production?.type,
        verification_status: "manual",
      });
      toast.success(`Claimed "${roleName}" on ${projectName}!`);
      fetchProduction();
    } catch {
      toast.error("Failed to claim credit");
    }
  };

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    if (!user) {
      requireAuth("add a role");
      return;
    }
    await handleClaim(newRole.trim());
    setNewRole("");
    setAddingRole(false);
  };

  const toggleDept = (name: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const Icon = production ? (INDUSTRY_ICONS[production.industry] || Database) : Database;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[hsl(230,20%,7%)]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(235,70%,65%)]" />
        <p className="text-xs text-[hsl(220,10%,45%)] animate-pulse">Loading production details with AI...</p>
      </div>
    );
  }

  if (!production) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[hsl(230,20%,7%)] text-white">
        <Database className="h-12 w-12 text-[hsl(230,15%,25%)]" />
        <p className="text-[hsl(220,10%,50%)]">Production not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const totalClaimed = platformRoles.length;

  return (
    <>
      <Helmet>
        <title>{projectName} — ThriveCredits™ | ThriveIN</title>
        <meta name="description" content={production.description || `${projectName} — production credits on ThriveCredits™.`} />
      </Helmet>

      <div className="min-h-screen bg-[hsl(230,20%,7%)] text-white pb-24">
        {/* Hero Header */}
        <div className="relative border-b border-[hsl(230,15%,16%)]">
          {production.image_url && (
            <div className="absolute inset-0 overflow-hidden">
              <img src={production.image_url} alt="" className="w-full h-full object-cover opacity-20 blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(230,20%,7%,0.6)] to-[hsl(230,20%,7%)]" />
            </div>
          )}
          <div className="relative container mx-auto max-w-3xl px-4 py-5">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-[hsl(220,10%,45%)] hover:text-white mb-4 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to search
            </button>

            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[hsl(235,65%,52%,0.15)] flex items-center justify-center shrink-0 border border-[hsl(235,65%,52%,0.25)]">
                <Icon className="h-7 w-7 text-[hsl(235,70%,65%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{projectName}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-[hsl(220,10%,50%)]">
                  <Badge className="text-[10px] bg-[hsl(235,65%,52%,0.12)] border-[hsl(235,65%,52%,0.25)] text-[hsl(235,70%,75%)]">
                    {production.type}
                  </Badge>
                  {production.year && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {production.year}</span>}
                  {production.industry && <span>{production.industry}</span>}
                  {production.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {production.location}</span>}
                </div>
              </div>
            </div>

            {production.description && (
              <p className="text-sm text-[hsl(220,10%,60%)] mt-4 leading-relaxed">{production.description}</p>
            )}

            {/* Meta pills */}
            <div className="flex items-center gap-3 flex-wrap mt-4 text-[11px] text-[hsl(220,10%,45%)]">
              {production.client_brand && (
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {production.client_brand}</span>
              )}
              {production.platform && (
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {production.platform}</span>
              )}
              {production.external_url && (
                <a href={production.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[hsl(235,70%,65%)] hover:underline">
                  <ExternalLink className="h-3 w-3" /> View Source
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-b border-[hsl(230,15%,16%)]">
          <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="font-bold text-lg">{production.total_roles}</p>
              <p className="text-[9px] text-[hsl(220,10%,42%)] uppercase tracking-wider">Total Roles</p>
            </div>
            <Separator orientation="vertical" className="h-8 bg-[hsl(230,15%,20%)]" />
            <div className="text-center">
              <p className="font-bold text-lg text-green-500">{totalClaimed}</p>
              <p className="text-[9px] text-[hsl(220,10%,42%)] uppercase tracking-wider">Claimed</p>
            </div>
            <Separator orientation="vertical" className="h-8 bg-[hsl(230,15%,20%)]" />
            <div className="text-center">
              <p className="font-bold text-lg text-[hsl(235,70%,65%)]">{production.total_roles - totalClaimed}</p>
              <p className="text-[9px] text-[hsl(220,10%,42%)] uppercase tracking-wider">Unclaimed</p>
            </div>
          </div>
        </div>

        {/* Platform-verified credits */}
        {platformRoles.length > 0 && (
          <div className="container mx-auto max-w-3xl px-4 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <h2 className="font-semibold text-xs uppercase tracking-wider text-[hsl(220,10%,50%)]">Verified on ThriveIN</h2>
            </div>
            <div className="space-y-1.5">
              {platformRoles.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                  <Avatar className="h-9 w-9 ring-2 ring-green-500/30 cursor-pointer" onClick={() => navigate(`/profile/${r.user_id}`)}>
                    <AvatarImage src={r.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-green-500/10">{(r.full_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate cursor-pointer hover:underline" onClick={() => navigate(`/profile/${r.user_id}`)}>{r.full_name || "Unknown"}</p>
                    <p className="text-xs text-[hsl(220,10%,50%)]">{r.role}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI-generated full credits by department */}
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[hsl(235,70%,65%)]" />
              <h2 className="font-semibold text-xs uppercase tracking-wider text-[hsl(220,10%,50%)]">Full Production Credits</h2>
            </div>
            <Badge className="text-[8px] bg-[hsl(235,65%,52%,0.12)] border-[hsl(235,65%,52%,0.25)] text-[hsl(235,70%,70%)]">
              <Sparkles className="h-2 w-2 mr-0.5" /> AI Enhanced
            </Badge>
          </div>

          <div className="space-y-2">
            {production.departments.map(dept => {
              const isExpanded = expandedDepts.has(dept.name);
              const claimedInDept = dept.roles.filter(r => platformRoles.some(pr => pr.role.toLowerCase() === r.role.toLowerCase())).length;

              return (
                <div key={dept.name} className="rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] overflow-hidden">
                  <button
                    onClick={() => toggleDept(dept.name)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(230,15%,13%)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{dept.name}</span>
                      <span className="text-[10px] text-[hsl(220,10%,42%)]">
                        {dept.roles.length} role{dept.roles.length !== 1 ? "s" : ""}
                        {claimedInDept > 0 && <> · <span className="text-green-500">{claimedInDept} claimed</span></>}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[hsl(220,10%,40%)]" /> : <ChevronDown className="h-4 w-4 text-[hsl(220,10%,40%)]" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[hsl(230,15%,16%)] px-4 py-2 space-y-1">
                      {dept.roles.map((role, ri) => {
                        const claimed = platformRoles.find(pr => pr.role.toLowerCase() === role.role.toLowerCase());
                        return (
                          <div key={ri} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[hsl(230,15%,13%)] transition-colors">
                            {claimed ? (
                              <Avatar className="h-8 w-8 ring-1 ring-green-500/30 cursor-pointer shrink-0" onClick={() => navigate(`/profile/${claimed.user_id}`)}>
                                <AvatarImage src={claimed.avatar_url || ""} />
                                <AvatarFallback className="text-[10px] bg-green-500/10">{(claimed.full_name || "?")[0]}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-[10px] bg-[hsl(230,15%,15%)] text-[hsl(220,10%,40%)]">{(role.name || "?")[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {claimed ? claimed.full_name : role.name || "Uncredited"}
                              </p>
                              <p className="text-[10px] text-[hsl(220,10%,48%)]">{role.role}</p>
                            </div>
                            {claimed ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <button onClick={() => navigate(`/profile/${claimed.user_id}`)} className="text-[10px] text-[hsl(235,70%,65%)] hover:underline">View</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleClaim(role.role)}
                                className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(235,70%,65%)] hover:text-[hsl(235,70%,75%)] shrink-0 px-2 py-1 rounded-md border border-[hsl(235,65%,52%,0.25)] hover:bg-[hsl(235,65%,52%,0.08)] transition-colors"
                              >
                                <UserPlus className="h-3 w-3" /> Claim
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add your role CTA */}
          <div className="mt-4">
            {addingRole ? (
              <div className="flex gap-2">
                <input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="e.g. Assistant Editor, Stylist..."
                  className="flex-1 h-10 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,11%)] px-3 text-sm text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:border-[hsl(235,65%,52%)]"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && handleAddRole()}
                />
                <Button onClick={handleAddRole} size="sm" className="bg-[hsl(235,65%,52%)] hover:bg-[hsl(235,65%,58%)] text-white h-10 px-4">
                  Claim
                </Button>
                <Button onClick={() => { setAddingRole(false); setNewRole(""); }} variant="ghost" size="sm" className="h-10 text-[hsl(220,10%,45%)]">
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingRole(true)}
                className="w-full py-3 rounded-xl border border-dashed border-[hsl(235,65%,52%,0.3)] text-xs font-semibold text-[hsl(235,70%,65%)] hover:bg-[hsl(235,65%,52%,0.06)] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> Worked on this? Add your role
              </button>
            )}
          </div>

          {/* Share */}
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[hsl(230,15%,20%)] text-[hsl(220,10%,60%)] hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied!");
              }}
            >
              <Link2 className="h-3.5 w-3.5" /> Share Production Page
            </Button>
          </div>
        </div>
      </div>

      <AuthPrompt open={authOpen} onOpenChange={setAuthOpen} action="claim this credit" />
    </>
  );
};

export default ProductionPage;
