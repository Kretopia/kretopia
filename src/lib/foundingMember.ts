// Founding Member program — shared constants & helpers
// Quest definitions and program deadline used by /founding-member,
// the profile entry card, and the Home dashboard nudge.

export type FoundingQuestKey = "claim_profile" | "log_credits" | "invite_signups";

export interface FoundingQuest {
  key: FoundingQuestKey;
  title: string;
  description: string;
  target: number;
}

export const FOUNDING_QUESTS: FoundingQuest[] = [
  {
    key: "claim_profile",
    title: "Claim and verify your profile",
    description: "Run the verification flow once — at least one credential confirmed.",
    target: 1,
  },
  {
    key: "log_credits",
    title: "Log 3 verified credits",
    description: "Add and confirm three credits so your work is on the record.",
    target: 3,
  },
  {
    key: "invite_signups",
    title: "Invite 3 friends who sign up",
    description: "Bring 3 collaborators onto the platform using your invite link.",
    target: 3,
  },
];

// Trinidad launch + 6 weeks. Update this constant when the launch date shifts.
// Format: ISO date (UTC midnight) — used purely for display + countdown.
export const FOUNDING_MEMBER_DEADLINE_ISO = "2026-06-15T23:59:59Z";

export function foundingDeadlineLabel(): string {
  try {
    return new Date(FOUNDING_MEMBER_DEADLINE_ISO).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "soon";
  }
}

export function foundingDaysLeft(): number {
  const ms = new Date(FOUNDING_MEMBER_DEADLINE_ISO).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
