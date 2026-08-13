import type { Quiz } from "@/types";

const KEY = "ll.quiz";

/**
 * La sesión del quiz activo se guarda en sessionStorage: se crea en /mapas y
 * se consume en /quiz. El backend no guarda el quiz para re-fetch posterior.
 */
export const quizSession = {
  save(quiz: Quiz) {
    sessionStorage.setItem(KEY, JSON.stringify(quiz));
  },

  load(): Quiz | null {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Quiz;
    } catch {
      return null;
    }
  },

  clear() {
    sessionStorage.removeItem(KEY);
  },
};