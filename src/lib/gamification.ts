// Thrive Status — premium airline-style tiers
export const LEVEL_NAMES = {
  'Member': { range: [1, 5], color: 'from-slate-400 to-slate-500', icon: '◆' },
  'Silver': { range: [6, 10], color: 'from-slate-300 to-slate-400', icon: '◆◆' },
  'Gold': { range: [11, 20], color: 'from-amber-500 to-yellow-600', icon: '★' },
  'Thriver': { range: [21, 30], color: 'from-primary to-primary', icon: '★★' },
  'Elite': { range: [31, 50], color: 'from-primary to-primary', icon: '★★★' },
  'Icon': { range: [51, 75], color: 'from-amber-400 to-amber-600', icon: '👑' },
  'Legend': { range: [76, 999], color: 'from-amber-300 via-yellow-400 to-amber-500', icon: '💎' },
} as const;

export function getLevelName(level: number): string {
  for (const [name, data] of Object.entries(LEVEL_NAMES)) {
    if (level >= data.range[0] && level <= data.range[1]) {
      return name;
    }
  }
  return 'Legend';
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
