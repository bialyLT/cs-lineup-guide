import type { Progression, ID, User } from "@/types";
import { apiClient } from "./client";
import { mapApiUser, type ApiProgression, type ApiUser } from "./mappers";

export interface QuestionTypeConfig {
  questionType: string;
  label: string;
  /** 0 = desde el inicio, 1+ = nivel requerido, null = solo con monedas. */
  unlockLevel: number | null;
  order: number;
  /** JSON text con los niveles por utilidad (solo tipo utility). */
  utilityLevels: string;
}

export interface MeUnlocked {
  maps: string[];
  places: number[];
  lineups: number[];
  /** Utilidades desbloqueadas por nivel (smoke, molotov, flashbang, he, decoy). */
  utilities: string[];
  questionTypes: string[];
  freeQuestionTypes: string[];
  questionTypeConfigs: QuestionTypeConfig[];
  freePlaceUsed: boolean;
  starterPlacesSelected: boolean;
  remainingStarterPlaces: number;
}

export interface MeCosts {
  map: number;
  placeBase: number;
  placeStep: number;
  lineup: number;
  questionType: number;
}

export interface MePayload {
  user: User;
  progression: Progression;
  unlocked: MeUnlocked;
  costs: MeCosts;
}

interface ApiMePayload {
  user: ApiUser;
  progression: ApiProgression;
  unlocked: {
    maps: string[];
    places: number[];
    lineups: number[];
    utilities: string[];
    question_types: string[];
    free_question_types: string[];
    question_type_configs: Array<{
      question_type: string;
      label: string;
      unlock_level: number | null;
      order: number;
      utility_levels: string;
    }>;
    free_place_used: boolean;
    starter_places_selected: boolean;
    remaining_starter_places: number;
  };
  costs: {
    map: number;
    place_base: number;
    place_step: number;
    lineup: number;
    question_type: number;
  };
}

export interface AuthResponse {
  user: User;
  refresh: string;
  access: string;
}

function mapMePayload(raw: ApiMePayload): MePayload {
  return {
    user: mapApiUser(raw.user),
    progression: {
      xp: raw.progression.xp,
      coins: raw.progression.coins,
      streak: raw.progression.streak,
      bestStreak: raw.progression.best_streak,
    },
    unlocked: {
      maps: raw.unlocked.maps,
      places: raw.unlocked.places,
      lineups: raw.unlocked.lineups,
      utilities: raw.unlocked.utilities,
      questionTypes: raw.unlocked.question_types,
      freeQuestionTypes: raw.unlocked.free_question_types,
      questionTypeConfigs: raw.unlocked.question_type_configs.map((config) => ({
        questionType: config.question_type,
        label: config.label,
        unlockLevel: config.unlock_level,
        order: config.order,
        utilityLevels: config.utility_levels,
      })),
      freePlaceUsed: raw.unlocked.free_place_used,
      starterPlacesSelected: raw.unlocked.starter_places_selected,
      remainingStarterPlaces: raw.unlocked.remaining_starter_places,
    },
    costs: {
      map: raw.costs.map,
      placeBase: raw.costs.place_base,
      placeStep: raw.costs.place_step,
      lineup: raw.costs.lineup,
      questionType: raw.costs.question_type,
    },
  };
}

export const userService = {
  /** GET /me/ → usuario + contadores + desbloqueos + costos. */
  me: async (): Promise<MePayload> => {
    const raw = await apiClient.get<ApiMePayload>("/me/");
    return mapMePayload(raw);
  },

  /** Desbloquea contenido: { kind: "map"|"place"|"lineup"|"question_type", id }.
   * Para kind="place", `via` opcional: "coins" | "starter" | "free". */
  unlock: (
    kind: "map" | "place" | "lineup" | "question_type",
    id: string | number,
    via?: "coins" | "starter" | "free",
  ): Promise<MePayload> =>
    apiClient
      .post<ApiMePayload>("/me/unlock/", {
        kind,
        id,
        ...(via ? { via } : {}),
      })
      .then(mapMePayload),

  /** Onboarding: elige los primeros lugares (mapas gratuitos). */
  selectStarterPlaces: (placeIds: number[]): Promise<MePayload> =>
    apiClient
      .post<ApiMePayload>("/me/starter-places/", { place_ids: placeIds })
      .then(mapMePayload),

  getUser: (id: ID) => apiClient.get<User>(`/users/${id}/`),

  login: (email: string, password: string) =>
    apiClient.post<{ refresh: string; access: string; user: ApiUser }>(
      "/auth/login/",
      { email, password },
    ),

  loginWithGoogle: (credential: string) =>
    apiClient.post<{ refresh: string; access: string; user: ApiUser }>(
      "/auth/google/",
      { credential },
    ),

  register: (body: { username: string; email: string; password: string }) =>
    apiClient.post<{ refresh: string; access: string; user: ApiUser }>(
      "/auth/register/",
      body,
    ),
};