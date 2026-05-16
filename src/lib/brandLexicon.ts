/**
 * Ownable brand language for ThriveIN.
 * Use these constants in user-facing UI instead of hand-written labels
 * so the platform speaks with one voice.
 *
 * See mem://strategy/thrive-agent-and-ownable-language
 */

export const BRAND = {
  // Product
  tagline: "Your Creative Executive Producer.",
  agentName: "Thrive",
  agentRole: "Creative Executive Producer",

  // Profile / EPK
  passport: "Creative Passport",
  passportShort: "Passport",
  passportTagline: "Your verified creative identity.",

  // Credits / verifications
  stamps: "Stamps",
  stampSingular: "Stamp",
  stampsSubtitle: "Verified credits on your Creative Passport",

  // Social proof
  cosign: "Co-sign",
  cosignVerb: "Co-sign",
  cosigners: "Co-signers",

  // Outreach
  rolodex: "The Rolodex",

  // Tier / status
  standing: "Standing",

  // Payments
  receipts: "Receipts",

  // Earned chips (display-only — never self-applied)
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
