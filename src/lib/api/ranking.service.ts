import type { User } from "@/types";
import { apiClient } from "./client";

export interface RankingEntry extends User {
  rank: number;
  xp: number;
}

/** Ranking global ordenado por experiencia. */
export const rankingService = {
  global: () => apiClient.get<RankingEntry[]>("/ranking/"),
};