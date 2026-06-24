/**
 * KRETOPIA BRAND BIBLE v2 — Ownable Language System
 *
 * Single source of truth for the words Kretopia owns. Use BRAND.* in
 * user-facing UI instead of hand-written labels.
 *
 * Ecosystem:
 *   Thrive Collective  → parent company (legal / footer)
 *   Kretopia           → the platform (the Creative Economy OS)
 *   ThriveIN           → community, events, magazine, IRL pillar (sub-brand)
 *   Kreto              → the AI Executive Producer (the agent)
 *
 * Routes, tables, edge functions still use thrive_* / izzy_* / etc.
 * That's intentional — those are infrastructure names, not user-facing.
 * Never surface them in UI.
 */

export const BRAND = {
  // ── Ecosystem ───────────────────────────────────────────────────────────
  name: "Kretopia",
  parent: "Thrive Collective",
  parentLine: "Kretopia by Thrive Collective",
  community: "ThriveIN", // events, magazine, IRL, meetups, dinners
  domain: "kretopia.com",

  // ── Category & positioning ──────────────────────────────────────────────
  category: "The Creative Economy OS.",
  categoryShort: "Creative Economy OS",
  tagline: "Where Creativity Lives.",
  welcomeLine: "Welcome to Kretopia. Where Creativity Lives.",
  promise: "Build your profile. Find opportunities. Collaborate. Get paid.",
  futurePromise: "Get discovered. Get stamped. Get booked.",

  // ── The agent ───────────────────────────────────────────────────────────
  // Kreto is the agent. Kretopia is the platform. Keep them distinct.
  // Internal code may say "thrive-agent" / "izzy" — never surface those.
  agentName: "Kreto",
  agentRole: "Your AI Executive Producer",
  agentTagline: "Meet Kreto. Your AI Executive Producer.",
  agentVoice: "Producer, manager, connector, strategist, mentor.",

  // ── Profile / EPK ───────────────────────────────────────────────────────
  passport: "Creative Passport",
  passportShort: "Passport",
  passportTagline: "Your verified creative identity.",
  passportHeadline: "The verified creative record the industry has been waiting for.",
  passportSubline: "One Passport. Every credit. Co-signed by the people who were actually there.",

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

  // ── Payments ───────────────────────────────────────────────────────────
  // Pay surface rebrands to KrePay. Code path / route stays /thrivepay.
  payments: "KrePay",
  receipts: "Receipts",

  // ── Opportunities (editorial label on Scout) ───────────────────────────
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

  // ── Crews (private invite-only communities) ─────────────────────────────
  crew: "Crew",
  crews: "Crews",
  crewSingular: "Crew",
  myCrews: "My Crews",
  crewRoom: "Room",
  crewRooms: "Rooms",
  crewPrivateWall: "This Crew is private. Ask the host for an invite.",

  // ── Top-level pillars (nav-facing labels) ──────────────────────────────
  pillars: {
    passport: "Passport",        // /profile
    scout: "Scout",              // opportunities
    match: "Match",              // collaborators
    studio: "Studio",            // projects (was ThriveDesk)
    soundstages: "SoundStages",  // live virtual rooms
    pay: "KrePay",
    kreto: "Kreto",
    community: "ThriveIN",       // events, magazine, IRL
  },
} as const;

/**
 * COLLISION POLICY
 */
export const BRAND_COLLISIONS = {
  studios: "Studio",
  productions: "Productions",
  events: "Events",
  sessions: "Sessions",
  connections: "Connections",
} as const;

/**
 * Voice rules for Kreto (the agent).
 * Kreto is a producer, not a chatbot. Never call it AI assistant / bot.
 */
export const KRETO_VOICE = {
  good: [
    "I found three opportunities for you.",
    "Your Creative Passport is 84% complete.",
    "You have a strong match with this creator.",
    "I'd recommend updating your portfolio.",
    "I put together a draft for you.",
  ],
  banned: [
    "AI generated",
    "AI-powered",
    "AI assistant",
    "Chatbot",
    "Copilot",
    "Bot",
  ],
} as const;

// Back-compat alias — older code imports THRIVE_VOICE.
export const THRIVE_VOICE = KRETO_VOICE;

/**
 * Campaign codenames.
 */
export const BRAND_CAMPAIGNS = {
  whereCreativityLives: "WHERE CREATIVITY LIVES",
  onTheRecord: "ON THE RECORD",
  getStamped: "GET STAMPED",
  showReceipts: "SHOW RECEIPTS",
  whoMadeThis: "WHO MADE THIS?",
  booked: "BOOKED",
} as const;
