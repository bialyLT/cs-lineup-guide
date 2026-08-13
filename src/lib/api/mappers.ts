import type { Progression, User } from "@/types";

export interface ApiUser {
  id: number | string;
  username: string;
  display_name?: string;
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