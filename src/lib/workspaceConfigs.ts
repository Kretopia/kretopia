// Single source of truth for ThriveDesk workspace types.
// Each workspace type maps to: visible tabs, default tab, AI persona, and starter templates.
// Tab keys correspond to the activeTab values handled in DeskTabContent.tsx.

import {
  Camera, Video, Music, Shirt, Calendar, Palette, Megaphone, Disc3,
  Scissors, FileText, Briefcase, Sparkles, User,
  // Tab icons
  MessageSquare, CheckSquare, FolderOpen, LayoutGrid, CheckCircle2, Wallet,
  FileSignature, StickyNote, Image as ImageIcon, ListChecks, Bot, ClipboardList,
  Clock, UserCheck, ArrowRightLeft, RotateCcw, Shield,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceType =
  | "photo_shoot"
  | "video_shoot"
  | "music_project"
  | "fashion_show"
  | "event_production"
  | "commissioned_art"
  | "brand_collab"
  | "dj_live_gig"
  | "edit_job"
  | "content_series"
  | "general";

export type DealType =
  | "solo"           // just me, tracking my own work
  | "paid"           // I'm paying someone
  | "getting_paid"   // I'm getting paid
  | "barter"         // exchange of value
  | "collab_no_money" // pure creative collab
  | "agent_brokered"; // 3-party (manager + client + creative)

// Tabs that exist today in DeskTabContent.tsx + new workflow-specific ones (turn 3)
export type DeskTabKey =
  | "today" | "messages" | "tasks" | "files" | "approvals" | "assets"
  | "board" | "contracts" | "scope" | "finance" | "notes" | "templates" | "ai"
  // new workflow-specific (built in turn 3)
  | "call_sheet" | "run_of_show" | "roll_call" | "split_sheet" | "exchange" | "revisions";

export interface WorkspaceConfig {
  id: WorkspaceType;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** Tabs shown in this workspace, in order. */
  tabs: DeskTabKey[];
  /** Default tab when entering the desk. */
  defaultTab: DeskTabKey;
  /** Friendly rename of "tasks" tab when relevant (e.g. "Shot List"). */
  tasksLabel?: string;
  /** AI persona system prompt addendum for Thrive Ops in this context. */
  aiPersonaPrompt: string;
  /** Suggested gradient hue for visual identity (uses semantic tokens). */
  accent: "primary" | "accent" | "secondary";
}

const COMMON_BASE: DeskTabKey[] = ["today", "messages", "tasks", "files", "notes", "ai"];

export const WORKSPACE_CONFIGS: Record<WorkspaceType, WorkspaceConfig> = {
  photo_shoot: {
    id: "photo_shoot",
    label: "Photo Shoot",
    shortLabel: "Photo",
    description: "Editorial, commercial, lifestyle, lookbooks",
    icon: Camera,
    tabs: ["today", "messages", "call_sheet", "roll_call", "tasks", "board", "assets", "files", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Shot List",
    aiPersonaPrompt: "You're producing a photo shoot. Help with call sheets, shot lists, lighting notes, model/talent coordination, and post-production milestones.",
    accent: "primary",
  },
  video_shoot: {
    id: "video_shoot",
    label: "Video / Film Shoot",
    shortLabel: "Video",
    description: "Music videos, short films, commercials, docs",
    icon: Video,
    tabs: ["today", "messages", "call_sheet", "run_of_show", "roll_call", "tasks", "board", "assets", "files", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Shot List",
    aiPersonaPrompt: "You're producing a video/film shoot. Help with call sheets, shot lists, scene breakdowns, equipment lists, talent releases, and edit milestones.",
    accent: "primary",
  },
  music_project: {
    id: "music_project",
    label: "Music Project",
    shortLabel: "Music",
    description: "Singles, EPs, albums, productions, sessions",
    icon: Music,
    tabs: ["today", "messages", "tasks", "split_sheet", "files", "assets", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Session Plan",
    aiPersonaPrompt: "You're producing a music project. Help with session planning, split sheets, mix/master revision rounds, sync licensing, and release milestones.",
    accent: "accent",
  },
  fashion_show: {
    id: "fashion_show",
    label: "Fashion Show",
    shortLabel: "Fashion",
    description: "Runway, lookbook drops, stylist projects",
    icon: Shirt,
    tabs: ["today", "messages", "run_of_show", "roll_call", "call_sheet", "tasks", "board", "assets", "files", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Looks & Tasks",
    aiPersonaPrompt: "You're producing a fashion show. Help with run of show, model lineup, looks/changes, backstage roll call, and vendor coordination.",
    accent: "secondary",
  },
  event_production: {
    id: "event_production",
    label: "Event Production",
    shortLabel: "Event",
    description: "Concerts, launches, festivals, activations",
    icon: Calendar,
    tabs: ["today", "messages", "run_of_show", "roll_call", "call_sheet", "tasks", "files", "approvals", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Production Tasks",
    aiPersonaPrompt: "You're producing a live event. Help with run of show, vendor lineup, roll call, load-in/out, and budget tracking.",
    accent: "accent",
  },
  commissioned_art: {
    id: "commissioned_art",
    label: "Commissioned Art",
    shortLabel: "Art",
    description: "Illustration, design, painting, custom work",
    icon: Palette,
    tabs: ["today", "messages", "tasks", "assets", "files", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Stages",
    aiPersonaPrompt: "You're managing a commissioned art piece. Help with concept rounds, milestone deliverables, revision tracking, and final handoff.",
    accent: "secondary",
  },
  brand_collab: {
    id: "brand_collab",
    label: "Brand Collab",
    shortLabel: "Brand",
    description: "Sponsored content, paid posts, UGC",
    icon: Megaphone,
    tabs: ["today", "messages", "tasks", "assets", "files", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Deliverables",
    aiPersonaPrompt: "You're managing a brand collaboration. Help with deliverable tracking, brief alignment, approval rounds, usage rights, and payment milestones.",
    accent: "primary",
  },
  dj_live_gig: {
    id: "dj_live_gig",
    label: "DJ / Live Gig",
    shortLabel: "Gig",
    description: "Club nights, weddings, residencies, live sets",
    icon: Disc3,
    tabs: ["today", "messages", "run_of_show", "tasks", "files", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Setlist & Tasks",
    aiPersonaPrompt: "You're managing a DJ/live performance gig. Help with setlist, tech rider, load-in time, payment terms, and rider requirements.",
    accent: "accent",
  },
  edit_job: {
    id: "edit_job",
    label: "Editing Job",
    shortLabel: "Edit",
    description: "Photo retouch, video edit, audio mix",
    icon: Scissors,
    tabs: ["today", "messages", "tasks", "files", "assets", "approvals", "revisions", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Edit Tasks",
    aiPersonaPrompt: "You're managing an editing job. Help with version control, revision rounds, raw asset organization, and final delivery.",
    accent: "secondary",
  },
  content_series: {
    id: "content_series",
    label: "Content Series",
    shortLabel: "Content",
    description: "Podcast, YouTube series, IG/TikTok content",
    icon: FileText,
    tabs: ["today", "messages", "tasks", "board", "assets", "files", "approvals", "contracts", "finance", "notes", "ai"],
    defaultTab: "today",
    tasksLabel: "Episodes & Tasks",
    aiPersonaPrompt: "You're producing a content series. Help with episode planning, content calendar, asset tracking, and publishing schedule.",
    accent: "primary",
  },
  general: {
    id: "general",
    label: "General Workspace",
    shortLabel: "General",
    description: "Custom — all tools available",
    icon: Briefcase,
    tabs: ["today", "messages", "tasks", "files", "approvals", "assets", "board", "contracts", "scope", "finance", "notes", "templates", "ai"],
    defaultTab: "today",
    aiPersonaPrompt: "You're managing a creative project. Adapt to whatever the user is working on.",
    accent: "primary",
  },
};

export const WORKSPACE_TYPE_LIST: WorkspaceConfig[] = [
  WORKSPACE_CONFIGS.photo_shoot,
  WORKSPACE_CONFIGS.video_shoot,
  WORKSPACE_CONFIGS.music_project,
  WORKSPACE_CONFIGS.fashion_show,
  WORKSPACE_CONFIGS.event_production,
  WORKSPACE_CONFIGS.commissioned_art,
  WORKSPACE_CONFIGS.brand_collab,
  WORKSPACE_CONFIGS.dj_live_gig,
  WORKSPACE_CONFIGS.edit_job,
  WORKSPACE_CONFIGS.content_series,
  WORKSPACE_CONFIGS.general,
];

export interface DealConfig {
  id: DealType;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Whether to surface the Finance tab. */
  showsFinance: boolean;
  /** Whether to surface the Exchange Ledger tab. */
  showsExchange: boolean;
}

export const DEAL_CONFIGS: Record<DealType, DealConfig> = {
  solo: {
    id: "solo",
    label: "Just me — solo",
    short: "Solo",
    description: "Planning or tracking your own work, no collaborators yet",
    icon: User,
    showsFinance: false,
    showsExchange: false,
  },
  paid: {
    id: "paid",
    label: "I'm paying someone",
    short: "Paying",
    description: "You hire creatives and pay them",
    icon: Briefcase,
    showsFinance: true,
    showsExchange: false,
  },
  getting_paid: {
    id: "getting_paid",
    label: "I'm getting paid",
    short: "Earning",
    description: "A client is paying you for the work",
    icon: Briefcase,
    showsFinance: true,
    showsExchange: false,
  },
  barter: {
    id: "barter",
    label: "Exchange / Barter",
    short: "Exchange",
    description: "Trading services or value (no cash)",
    icon: Sparkles,
    showsFinance: false,
    showsExchange: true,
  },
  collab_no_money: {
    id: "collab_no_money",
    label: "Pure Collab",
    short: "Collab",
    description: "Creative collab — no money, no exchange",
    icon: Sparkles,
    showsFinance: false,
    showsExchange: false,
  },
  agent_brokered: {
    id: "agent_brokered",
    label: "Agent / Brokered",
    short: "Agent",
    description: "You're the middle person between client and creative",
    icon: Briefcase,
    showsFinance: true,
    showsExchange: false,
  },
};

export const DEAL_TYPE_LIST: DealConfig[] = [
  DEAL_CONFIGS.solo,
  DEAL_CONFIGS.paid,
  DEAL_CONFIGS.getting_paid,
  DEAL_CONFIGS.barter,
  DEAL_CONFIGS.collab_no_money,
  DEAL_CONFIGS.agent_brokered,
];

/**
 * Resolve the actual tabs to render for a workspace based on its config + deal type.
 * Filters out finance/exchange when not relevant.
 */
export function resolveTabs(workspaceType: WorkspaceType, dealType: DealType): DeskTabKey[] {
  const wc = WORKSPACE_CONFIGS[workspaceType] ?? WORKSPACE_CONFIGS.general;
  const dc = DEAL_CONFIGS[dealType] ?? DEAL_CONFIGS.paid;

  return wc.tabs.filter((tab) => {
    if (tab === "finance" && !dc.showsFinance) return false;
    if (tab === "exchange" && !dc.showsExchange) return false;
    return true;
  }).concat(
    // Inject exchange tab for barter deals if not already in config
    dc.showsExchange && !wc.tabs.includes("exchange") ? ["exchange" as DeskTabKey] : []
  );
}

export function getWorkspaceConfig(workspaceType: string | null | undefined): WorkspaceConfig {
  return WORKSPACE_CONFIGS[(workspaceType as WorkspaceType) ?? "general"] ?? WORKSPACE_CONFIGS.general;
}

export function getDealConfig(dealType: string | null | undefined): DealConfig {
  return DEAL_CONFIGS[(dealType as DealType) ?? "paid"] ?? DEAL_CONFIGS.paid;
}
