import type { Progression, ID, User } from "@/types";
import { apiClient } from "./client";
import { mapApiUser, type ApiProgression, type ApiUser } from "./mappers";

export interface MeUnlocked {
  maps: string[];
  places: number[];
  questionTypes: string[];
  freeQuestionTypes: string[];
  freePlaceUsed: boolean;
  starterPlacesSelected: boolean;
}

export interface MeCosts {
  map: number;
  placeBase: number;
  placeStep: number;
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
    question_types: string[];
    free_question_types: string[];
    free_place_used: boolean;
    starter_places_selected: boolean;
  };
  costs: {
    map: number;
    place_base: number;
    place_step: number;
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
      questionTypes: raw.unlocked.question_types,
      freeQuestionTypes: raw.unlocked.free_question_types,
      freePlaceUsed: raw.unlocked.free_place_used,
      starterPlacesSelected: raw.unlocked.starter_places_selected,
    },
    costs: {
      map: raw.costs.map,
      placeBase: raw.costs.place_base,
      placeStep: raw.costs.place_step,
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

  /** Desbloquea contenido con monedas: { kind: "map"|"place"|"question_type", id }. */
  unlock: (kind: "map" | "place" | "question_type", id: string | number): Promise<MePayload> =>
    apiClient
      .post<ApiMePayload>("/me/unlock/", { kind, id })
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