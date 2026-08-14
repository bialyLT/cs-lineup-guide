import type { Progression, User } from "@/types";

export interface ApiUser {
  id: number | string;
  username: string;
  display_name?: string;
  is_staff?: boolean;
}

export interface ApiProgression {
  xp: number;
  coins: number;
  streak: number;
  best_streak: number;
}

export function mapApiUser(raw: ApiUser): User {
  return {
    id: String(raw.id),
    username: raw.username,
    displayName: raw.display_name,
    isStaff: Boolean(raw.is_staff),
  };
}

export function mapApiProgression(raw: ApiProgression): Progression {
  return {
    xp: raw.xp,
    coins: raw.coins,
    streak: raw.streak,
    bestStreak: raw.best_streak,
  };
}