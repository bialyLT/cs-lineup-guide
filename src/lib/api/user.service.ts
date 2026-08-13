import type { Progression, ID, User } from "@/types";
import { apiClient } from "./client";
import { mapApiUser, type ApiProgression, type ApiUser } from "./mappers";

export interface MeUnlocked {
  maps: string[];
  places: number[];
  questionTypes: string[];
  freeQuestionTypes: string[];
  freePlaceUsed: boolean;
}

export interface MePayload {
  user: User;
  progression: Progression;
  unlocked: MeUnlocked;
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
  };
}

export interface AuthResponse {
  user: User;
  refresh: string;
  access: string;
}

export const userService = {
  /** GET /me/ → usuario + contadores + desbloqueos. */
  me: async (): Promise<MePayload> => {
    const raw = await apiClient.get<ApiMePayload>("/me/");
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
      },
    };
  },

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