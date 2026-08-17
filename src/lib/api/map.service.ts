import type { Lineup, Map, Place, Position, UtilityType } from "@/types";
import { apiClient } from "./client";

interface ApiLineup {
  id: number;
  place: number;
  title: string;
  util: string;
  description?: string | null;
  unlocked?: boolean;
  unlock_cost?: number | null;
  question_count?: number | null;
}

interface ApiPlace {
  id: number;
  name: string;
  position?: { x: number; y: number } | null;
  unlocked: boolean;
  unlock_cost?: number | null;
  lineups?: ApiLineup[];
}

interface ApiUnlockStats {
  total_places: number;
  unlocked_places: number;
  total_lineups: number;
  unlocked_lineups: number;
}

export interface ApiMap {
  id: string;
  name: string;
  image_url?: string | null;
  is_free: boolean;
  unlocked: boolean;
  unlock_cost?: number | null;
  unlock_stats?: ApiUnlockStats | null;
  places?: ApiPlace[];
}

function mapApiLineup(raw: ApiLineup, mapId: string): Lineup {
  return {
    id: String(raw.id),
    mapId,
    placeId: String(raw.place),
    title: raw.title,
    util: raw.util as UtilityType,
    positions: [],
    description: raw.description ?? undefined,
    unlocked: raw.unlocked,
    unlockCost: raw.unlock_cost ?? undefined,
    questionCount: raw.question_count ?? undefined,
  };
}

function mapApiPlace(raw: ApiPlace, mapId: string): Place {
  const position: Position = raw.position
    ? { x: raw.position.x, y: raw.position.y }
    : { x: 0, y: 0 };
  return {
    id: String(raw.id),
    mapId,
    name: raw.name,
    position,
    unlocked: raw.unlocked,
    unlockCost: raw.unlock_cost ?? undefined,
    lineups: raw.lineups?.map((lineup) => mapApiLineup(lineup, mapId)),
  };
}

function mapApiMap(raw: ApiMap): Map {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image_url ?? undefined,
    isFree: raw.is_free,
    unlocked: raw.unlocked,
    unlockCost: raw.unlock_cost ?? undefined,
    unlockStats: raw.unlock_stats
      ? {
          totalPlaces: raw.unlock_stats.total_places,
          unlockedPlaces: raw.unlock_stats.unlocked_places,
          totalLineups: raw.unlock_stats.total_lineups,
          unlockedLineups: raw.unlock_stats.unlocked_lineups,
        }
      : undefined,
    places: (raw.places ?? []).map((place) => mapApiPlace(place, raw.id)),
  };
}

/** Servicios de consulta de mapas. */
export const mapService = {
  /** Todos los mapas con su estado de desbloqueo y sus lugares. */
  list: async (): Promise<Map[]> => {
    const raw = await apiClient.get<ApiMap[]>("/maps/");
    return raw.map(mapApiMap);
  },

  /** Lugares de un mapa con sus lineups (detalle del mapa). */
  getPlaces: async (mapId: string): Promise<Place[]> => {
    const raw = await apiClient.get<ApiPlace[]>(`/maps/${mapId}/places/`);
    return raw.map((place) => mapApiPlace(place, mapId));
  },
};
