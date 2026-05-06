/**
 * Workspace Type Registry — drives the adaptive Studio.
 * Each workspace_type maps to its module set, copilot persona, and starter content.
 */
import type { LucideIcon } from "lucide-react";
import { Mic, Calendar, Camera, Megaphone, Music2, Briefcase, Sparkles } from "lucide-react";

export type WorkspaceType =
  | "podcast"
  | "event"
  | "content"
  | "campaign"
  | "music"
  | "client"
  | "general";

export interface WorkspaceConfig {
  type: WorkspaceType;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Copilot system addendum for this kind of work */
  copilotPersona: string;
  /** Default vault folder names */
  vaultFolders: string[];
  /** Default deliverables to suggest at creation */
  defaultDeliverables: string[];
  /** Modules the Studio Room should mount (besides shared brief/work/money) */
  modules: Array<"podcast" | "event_runsheet" | "content_shotlist" | "campaign_matrix" | "music_releases">;
}

export const WORKSPACE_CONFIGS: Record<WorkspaceType, WorkspaceConfig> = {
  podcast: {
    type: "podcast",
    label: "Podcast",
    tagline: "Episodes, guests, clips & sponsors.",
    icon: Mic,
    copilotPersona: "You are helping run a podcast. When the user mentions guests, episodes, sponsors, or clips, propose concrete next moves (book guest, draft questions, schedule recording, generate clip).",
    vaultFolders: ["Episodes", "Cover Art", "Sponsor Decks", "Clips", "Show Notes"],
    defaultDeliverables: ["Pilot episode published", "Cover art finalized", "First 3 sponsors pitched"],
    modules: ["podcast"],
  },
  event: {
    type: "event",
    label: "Event",
    tagline: "Run sheet, vendors, sponsors, guests.",
    icon: Calendar,
    copilotPersona: "You are producing an event. Help with run sheets, vendor coordination, guest lists, and sponsor activation. Be precise about times.",
    vaultFolders: ["Run Sheet", "Vendor Quotes", "Floor Plans", "Guest Lists", "Sponsor Decks"],
    defaultDeliverables: ["Venue confirmed", "Run sheet locked", "Sponsors signed"],
    modules: ["event_runsheet"],
  },
  content: {
    type: "content",
    label: "Content Shoot",
    tagline: "Shot list, script, calendar, exports.",
    icon: Camera,
    copilotPersona: "You're helping plan and produce a content shoot. Think shot lists, scripts, B-roll, posting cadence and platform-specific export.",
    vaultFolders: ["Scripts", "Shot Lists", "Raw", "Edits", "Final Exports"],
    defaultDeliverables: ["Script approved", "Shot list locked", "First post live"],
    modules: ["content_shotlist"],
  },
  campaign: {
    type: "campaign",
    label: "Brand Campaign",
    tagline: "Brief, asset matrix, paid + organic plan.",
    icon: Megaphone,
    copilotPersona: "You're running a brand campaign. Track deliverables per platform, paid vs organic, brand guidelines, and approvals.",
    vaultFolders: ["Brand Brief", "Assets", "Approvals", "Reporting"],
    defaultDeliverables: ["Brief signed", "Hero asset delivered", "Launch week scheduled"],
    modules: ["campaign_matrix"],
  },
  music: {
    type: "music",
    label: "Music Release",
    tagline: "Tracklist, splits, release plan.",
    icon: Music2,
    copilotPersona: "You're producing a music release. Help with tracklists, collaborator splits, mastering, distribution and pre-save.",
    vaultFolders: ["Stems", "Masters", "Artwork", "Press Kit", "Splits"],
    defaultDeliverables: ["Masters delivered", "Artwork finalized", "Distro live"],
    modules: ["music_releases"],
  },
  client: {
    type: "client",
    label: "Client Project",
    tagline: "Scope, milestones, invoices.",
    icon: Briefcase,
    copilotPersona: "You're managing a client engagement. Stay focused on scope, milestones, deliverables and getting paid on time.",
    vaultFolders: ["Brief", "Drafts", "Approvals", "Final Delivery", "Invoices"],
    defaultDeliverables: ["Kickoff scheduled", "Milestone 1 delivered", "Final invoice paid"],
    modules: [],
  },
  general: {
    type: "general",
    label: "General Project",
    tagline: "Open canvas — add what you need.",
    icon: Sparkles,
    copilotPersona: "You are helping a creative get something done. Be flexible and propose useful next moves based on context.",
    vaultFolders: ["References", "Drafts", "Final"],
    defaultDeliverables: [],
    modules: [],
  },
};

export function getWorkspaceConfig(type?: string | null): WorkspaceConfig {
  return WORKSPACE_CONFIGS[(type as WorkspaceType) || "general"] || WORKSPACE_CONFIGS.general;
}
