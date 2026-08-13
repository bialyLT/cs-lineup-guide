/**
 * El nivel se deriva de la experiencia: no se guarda un atributo separado.
 * Regla simple y ajustable: cada nivel requiere XP_PER_LEVEL puntos.
 */

export const XP_PER_LEVEL = 500;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): number {
  return XP_PER_LEVEL - xpIntoLevel(xp);
}

export interface LevelProgress {
  level: number;
  /** XP acumulada dentro del nivel actual. */
  current: number;
  /** XP que falta para el siguiente nivel. */
  needed: number;
  /** Fracción (0-1) de avance dentro del nivel. */
  fraction: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const current = xpIntoLevel(xp);
  return {
    level: levelFromXp(xp),
    current,
    needed: xpToNextLevel(xp),
    fraction: current / XP_PER_LEVEL,
  };
}