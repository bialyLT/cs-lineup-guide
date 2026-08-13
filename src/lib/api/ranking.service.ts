import type { ID } from "@/types";
import { apiClient } from "./client";

export interface RankingEntry {
  rank: number;
  userId: ID;
  username: string;
  displayName?: string;
  xp: number;
}

export interface RankingResponse {
  entries: RankingEntry[];
  you: RankingEntry;
}

interface ApiEntry {
  rank: number;
  user_id: number;
  username: string;
  display_name: string;
  xp: number;
}

interface ApiRanking {
  entries: ApiEntry[];
  you: ApiEntry;
}

function mapApiEntry(raw: ApiEntry): RankingEntry {
  return {
    rank: raw.rank,
    userId: String(raw.user_id),
    username: raw.username,
    displayName: raw.display_name,
    xp: raw.xp,
  };
}

/** Ranking global ordenado por experiencia. */
export const rankingService = {
  global: async (): Promise<RankingResponse> => {
    const raw = await apiClient.get<ApiRanking>("/ranking/");
    return {
      entries: raw.entries.map(mapApiEntry),
      you: mapApiEntry(raw.you),
    };
  },
};