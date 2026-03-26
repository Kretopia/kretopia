import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { hasProAccess } from "@/lib/subscriptionConfig";

export interface Collaborator {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to?: string | null;
  is_pinned?: boolean;
  profiles?: { full_name: string; avatar_url: string | null } | null;
  [key: string]: any;
}

export function useProjectData(projectId: string | undefined) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<"creator" | "client">("creator");

  // Fetch all user projects for sidebar
  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false });
    setProjects(data || []);
  }, []);

  // Batch-fetch collaborator profiles (fixes N+1)
  const fetchCollaborators = useCallback(
    async (projectData: any) => {
      const { data: collabData } = await supabase
        .from("project_collaborators")
        .select("user_id")
        .eq("project_id", projectId!)
        .eq("status", "accepted");

      const userIds = new Set<string>();
      userIds.add(projectData.created_by);
      collabData?.forEach((c) => {
        if (c.user_id) userIds.add(c.user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", Array.from(userIds));

      if (!profiles) return [];

      // Owner first, then others
      const sorted = profiles.sort((a, b) =>
        a.user_id === projectData.created_by ? -1 : b.user_id === projectData.created_by ? 1 : 0
      );
      return sorted.map((p) => ({
        id: p.user_id,
        full_name: p.full_name || "",
        avatar_url: p.avatar_url,
        role: p.role,
      }));
    },
    [projectId]
  );

  // Batch-fetch message profiles (fixes N+1)
  const fetchMessages = useCallback(async () => {
    const { data: messagesData } = await supabase
      .from("project_messages")
      .select("*, reply_to, is_pinned")
      .eq("project_id", projectId!)
      .order("created_at", { ascending: true });

    if (!messagesData || messagesData.length === 0) return [];

    const userIds = [...new Set(messagesData.map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    return messagesData.map((msg) => ({
      ...msg,
      profiles: profileMap.get(msg.user_id) || null,
    }));
  }, [projectId]);

  const fetchProjectData = useCallback(
    async (isInitial = false) => {
      if (!projectId || !user) return;
      try {
        if (isInitial) setLoading(true);

        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();
        if (projectError) throw projectError;

        const { data: hasAccess } = await supabase.rpc("user_has_project_access", {
          project_id_param: projectId,
          user_id_param: user.id,
        });
        if (!hasAccess) {
          toast({
            title: "Access denied",
            description: "You don't have access to this project",
            variant: "destructive",
          });
          navigate("/circle");
          return;
        }

        setProject(projectData);
        setUserRole(projectData.created_by === user.id ? "client" : "creator");

        // Parallel batch fetches
        const [collabs, msgs, filesRes, tasksRes, milestonesRes] = await Promise.all([
          fetchCollaborators(projectData),
          fetchMessages(),
          supabase.from("project_files").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
          supabase.from("project_tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
          supabase.from("milestones").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
        ]);

        setCollaborators(collabs);
        setMessages(msgs);
        setFiles(filesRes.data || []);
        setTasks(tasksRes.data || []);
        setMilestones(milestonesRes.data || []);
      } catch (error: any) {
        console.error("Error fetching project data:", error);
        toast({ title: "Error loading project", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [projectId, user, navigate, toast, fetchCollaborators, fetchMessages]
  );

  // Initial load + analytics
  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  useEffect(() => {
    if (projectId && user) {
      fetchProjectData(true);
      import("@/lib/analytics").then(({ analytics }) => {
        analytics.pageView("thrivedesk");
        analytics.featureUsed("thrivedesk_opened", { project_id: projectId });
      });
    }
  }, [projectId, user, fetchProjectData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_files", filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_messages", filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
      .on("postgres_changes", { event: "*", schema: "public", table: "milestones", filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchProjectData]);

  return {
    loading,
    project,
    collaborators,
    files,
    messages,
    tasks,
    milestones,
    projects,
    userRole,
    isPro,
    user,
    fetchProjectData,
  };
}
