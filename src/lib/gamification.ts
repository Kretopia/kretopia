// Gamification level names and tiers
export const LEVEL_NAMES = {
  'Spark': { range: [1, 5], color: 'from-yellow-400 to-orange-500', icon: '✨' },
  'Rising Star': { range: [6, 10], color: 'from-orange-500 to-pink-500', icon: '⭐' },
  'Creator': { range: [11, 20], color: 'from-pink-500 to-purple-500', icon: '🎨' },
  'Maverick': { range: [21, 30], color: 'from-purple-500 to-blue-500', icon: '🚀' },
  'Visionary': { range: [31, 50], color: 'from-blue-500 to-cyan-500', icon: '👁️' },
  'Legend': { range: [51, 75], color: 'from-cyan-500 to-green-500', icon: '🏆' },
  'Icon': { range: [76, 999], color: 'from-green-500 to-emerald-500', icon: '👑' },
} as const;

export function getLevelName(level: number): string {
  for (const [name, data] of Object.entries(LEVEL_NAMES)) {
    if (level >= data.range[0] && level <= data.range[1]) {
      return name;
    }
  }
  return 'Icon';
}

export function getLevelData(level: number) {
  const name = getLevelName(level);
  return { name, ...LEVEL_NAMES[name as keyof typeof LEVEL_NAMES] };
}

export function getXPForLevel(level: number): number {
  if (level <= 5) return (level - 1) * 100;
  if (level <= 10) return 500 + (level - 6) * 200;
  if (level <= 20) return 1500 + (level - 11) * 250;
  if (level <= 30) return 4000 + (level - 21) * 350;
  if (level <= 50) return 7500 + (level - 31) * 500;
  if (level <= 75) return 17500 + (level - 51) * 800;
  return 37500 + (level - 76) * 1000;
}

export function getXPForNextLevel(currentLevel: number): number {
  return getXPForLevel(currentLevel + 1);
}
