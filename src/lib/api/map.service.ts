import type { Map } from "@/types";
import { apiClient } from "./client";

export interface ApiMap {
  id: string;
  name: string;
  image_url?: string | null;
  is_free: boolean;
  unlocked: boolean;
  places?: unknown[];
}

function mapApiMap(raw: ApiMap): Map {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image_url ?? undefined,
    isFree: raw.is_free,
    unlocked: raw.unlocked,
  };
}

/** Servicios de consulta de mapas. */
export const mapService = {
  /** Todos los mapas con su estado de desbloqueo. */
  list: async (): Promise<Map[]> => {
    const raw = await apiClient.get<ApiMap[]>("/maps/");
    return raw.map(mapApiMap);
  },
};