// Arena Ranking System for Cre8 Arena - GuruShots inspired progression
export interface ArenaRank {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  gradient: string;
  minWins: number;
  description: string;
}

export const ARENA_RANKS: ArenaRank[] = [
  {
    name: "rookie",
    displayName: "Rookie",
    icon: "🌱",
    color: "text-slate-500",
    gradient: "from-slate-400 to-slate-500",
    minWins: 0,
    description: "Just getting started",
  },
  {
    name: "enthusiast",
    displayName: "Enthusiast",
    icon: "🎯",
    color: "text-green-500",
    gradient: "from-green-400 to-emerald-500",
    minWins: 0,
    description: "3+ challenge entries",
  },
  {
    name: "contender",
    displayName: "Contender",
    icon: "⚡",
    color: "text-blue-500",
    gradient: "from-blue-400 to-blue-600",
    minWins: 0,
    description: "10+ challenge entries",
  },
  {
    name: "challenger",
    displayName: "Challenger",
    icon: "🔥",
    color: "text-orange-500",
    gradient: "from-orange-400 to-red-500",
    minWins: 1,
    description: "First challenge win",
  },
  {
    name: "veteran",
    displayName: "Veteran",
    icon: "⭐",
    color: "text-amber-500",
    gradient: "from-amber-400 to-orange-500",
    minWins: 3,
    description: "3+ wins or 10+ Top 10 finishes",
  },
  {
    name: "champion",
    displayName: "Champion",
    icon: "🏆",
    color: "text-purple-500",
    gradient: "from-purple-400 to-purple-600",
    minWins: 5,
    description: "5+ wins or 15+ All-Star finishes",
  },
  {
    name: "master",
    displayName: "Master",
    icon: "💎",
    color: "text-cyan-500",
    gradient: "from-cyan-400 to-blue-500",
    minWins: 10,
    description: "10+ wins or 30+ All-Star finishes",
  },
  {
    name: "guru",
    displayName: "Guru",
    icon: "👑",
    color: "text-yellow-500",
    gradient: "from-yellow-400 to-amber-500",
    minWins: 20,
    description: "The highest arena rank",
  },
];

export const getRankByName = (name: string): ArenaRank => {
  return ARENA_RANKS.find((r) => r.name === name) || ARENA_RANKS[0];
};

export const getRankIndex = (name: string): number => {
  return ARENA_RANKS.findIndex((r) => r.name === name);
};

export const getNextRank = (currentRank: string): ArenaRank | null => {
  const idx = getRankIndex(currentRank);
  if (idx < ARENA_RANKS.length - 1) return ARENA_RANKS[idx + 1];
  return null;
};

export const ACHIEVEMENT_TIERS = {
  winner: { label: "🏆 Winner", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30", xp: 0 }, // XP set by cadence
  top_10: { label: "🔟 Top 10%", color: "bg-purple-500/20 text-purple-700 border-purple-500/30", xp: 50 },
  all_star: { label: "⭐ All-Star", color: "bg-blue-500/20 text-blue-700 border-blue-500/30", xp: 75 },
  gurus_pick: { label: "👑 Guru's Pick", color: "bg-amber-500/20 text-amber-700 border-amber-500/30", xp: 100 },
} as const;
