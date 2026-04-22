/**
 * Primary Intent — what the user is here to do.
 * Drives starter card steps, home feed ordering, and re-engagement nudges.
 */
export type PrimaryIntent = "collaborate" | "gigs" | "fund" | "manage";

export const INTENTS: {
  id: PrimaryIntent;
  label: string;
  short: string;
  blurb: string;
  emoji: string;
}[] = [
  {
    id: "collaborate",
    label: "Find collaborators",
    short: "Collaborate",
    blurb: "Connect with creators, build your circle, jam on projects.",
    emoji: "🤝",
  },
  {
    id: "gigs",
    label: "Find opportunities",
    short: "Gigs",
    blurb: "Apply to paid gigs, casting calls, and creative briefs.",
    emoji: "🎯",
  },
  {
    id: "fund",
    label: "Fund a project",
    short: "Fund",
    blurb: "Launch a campaign, raise from your community, ship it.",
    emoji: "🚀",
  },
  {
    id: "manage",
    label: "Manage my work",
    short: "Manage",
    blurb: "Run projects, send invoices, get paid, stay organized.",
    emoji: "🗂️",
  },
];

export function intentMeta(id: PrimaryIntent | string | null | undefined) {
  return INTENTS.find((i) => i.id === id) ?? null;
}
