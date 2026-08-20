import type { Progression, User } from "@/types";

export interface ApiUser {
  id: number | string;
  username: string;
  display_name?: string;
  email?: string;
  is_staff?: boolean;
  is_email_verified?: boolean;
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
    email: raw.email,
    isStaff: Boolean(raw.is_staff),
    isEmailVerified: Boolean(raw.is_email_verified),
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