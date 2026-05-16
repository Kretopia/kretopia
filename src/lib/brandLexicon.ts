/**
 * THRIVEIN BRAND BIBLE v1 — Ownable Language System
 *
 * Single source of truth for the words ThriveIN owns. Use BRAND.* constants
 * in user-facing UI instead of hand-written labels. These are IP — guard them.
 *
 * Category: The Operating System for Creative Careers.
 * Long term: The Infrastructure Layer for Creative Work.
 *
 * See mem://style/branding/brand-bible-v1
 * See mem://strategy/thrive-agent-and-ownable-language
 */

export const BRAND = {
  // ── Category & positioning ──────────────────────────────────────────────
  name: "ThriveIN",
  category: "The Operating System for Creative Careers.",
  categoryShort: "Creative Operating System",
  promise: "Find your people. Run the project. Get paid.",
  futurePromise: "Get discovered. Get stamped. Get booked.",

  // ── The agent ───────────────────────────────────────────────────────────
  agentName: "Thrive",
  agentRole: "Your Creative Executive Producer",
  agentTagline: "Meet Thrive. Your Creative Executive Producer.",

  // ── Profile / EPK ───────────────────────────────────────────────────────
  passport: "Creative Passport",
  passportShort: "Passport",
  passportTagline: "Your verified creative identity.",

  // ── Credits / verifications ────────────────────────────────────────────
  stamps: "Stamps",
  stampSingular: "Stamp",
  stampsSubtitle: "Verified credits on your Creative Passport",
  stampVerb: "Get Stamped",

  // ── Social proof / endorsements ────────────────────────────────────────
  cosign: "Co-sign",
  cosignVerb: "Co-sign",
  cosigners: "Co-signers",

  // ── Outreach ───────────────────────────────────────────────────────────
  rolodex: "The Rolodex",

  // ── Tier / reputation ──────────────────────────────────────────────────
  standing: "Standing",
  standingLevels: {
    rising: "Rising",
    working: "Working",
    booked: "Booked",
    featured: "Featured",
    legend: "Legend",
  },

  // ── Payments ───────────────────────────────────────────────────────────
  receipts: "Receipts",

  // ── Opportunities (editorial label on Scout) ───────────────────────────
  // NOTE: route stays /scout, table stays `opportunities`/`gigs` — this is
  // a display label only. Keep "Gigs" for SEO equity on share pages.
  calls: "Calls",
  callsExamples: ["Open Calls", "Casting Calls", "Brand Calls"],

  // ── Applications ───────────────────────────────────────────────────────
  putForward: "Put Forward",

  // ── Portfolio ──────────────────────────────────────────────────────────
  pressKit: "Press Kit",

  // ── Earned chips (display-only — NEVER self-applied) ───────────────────
  titles: {
    verifiedCreative: "Verified Creative",
    workingCreative: "Working Creative",
    bookedAndBusy: "Booked & Busy",
    topCosigner: "Top Co-signer",
    scouted: "Scouted",
    foundingCreative: "Founding Creative",
    setLeader: "Set Leader",
    houseProducer: "House Producer",
  },
} as const;

/**
 * COLLISION POLICY — words G proposed that conflict with shipped concepts.
 * Decisions locked: keep existing container names, borrow G's editorial words
 * only where they don't whiplash users.
 */
export const BRAND_COLLISIONS = {
  // "Productions" collides with Studios/ThriveDesk/Studio Room.
  // RULE: Studios = the workspace container. Productions = the *output*
  // (a finished body of work shown on the Creative Passport).
  studios: "Studios",
  productions: "Productions", // Passport output only

  // "Rooms" collides with video call rooms + Spark rooms.
  // RULE: keep "Events" as the surface name. "Sessions" allowed in copy.
  events: "Events",
  sessions: "Sessions",

  // "Circle" already means the community feature.
  // RULE: keep "Connections" everywhere. "The Circle" is OK as a Passport
  // module label ("12 in their Circle") only.
  connections: "Connections",
} as const;

/**
 * Voice rules for Thrive (the agent).
 * Thrive is a presence, not a chatbot. Never call it AI.
 */
export const THRIVE_VOICE = {
  good: [
    "Thrive noticed something.",
    "Thrive made a draft.",
    "Thrive put together a plan.",
    "Thrive remembers your sponsors.",
    "Thrive scouted three new Calls for you.",
  ],
  banned: [
    "AI generated",
    "AI-powered",
    "AI assistant",
    "Chatbot",
    "Copilot", // reserved for legacy surfaces, do not introduce
    "Bot",
  ],
} as const;

/**
 * Campaign codenames (next 90 days).
 */
export const BRAND_CAMPAIGNS = {
  onTheRecord: "ON THE RECORD",
  getStamped: "GET STAMPED",
  showReceipts: "SHOW RECEIPTS",
  whoMadeThis: "WHO MADE THIS?",
  booked: "BOOKED",
} as const;
