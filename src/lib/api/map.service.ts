import type { Map, Place, Lineup, ID } from "@/types";
import { apiClient } from "./client";

/** Servicios de consulta de mapas, lugares y lineups. */
export const mapService = {
  /** Todos los mapas con su estado de desbloqueo. */
  list: () => apiClient.get<Map[]>("/maps/"),

  detail: (id: ID) => apiClient.get<Map>(`/maps/${id}/`),

  /** Lugares destacados de un mapa. */
  places: (mapId: ID) => apiClient.get<Place[]>(`/maps/${mapId}/places/`),

  /** Lineups disponibles sobre un mapa. */
  lineups: (mapId: ID) => apiClient.get<Lineup[]>(`/maps/${mapId}/lineups/`),
};