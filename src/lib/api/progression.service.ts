import type { Progression } from "@/types";
import { apiClient } from "./client";

/** Progreso del usuario: xp, nivel, racha y monedas. */
export const progressionService = {
  get: () => apiClient.get<Progression>("/me/progression/"),
};