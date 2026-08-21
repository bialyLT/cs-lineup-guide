import type { Quiz } from "@/types";

const KEY = "ll.quiz";
const INDEX_KEY = "ll.quiz.index";

/**
 * La sesión del quiz activo se guarda en sessionStorage: se crea en /mapas y
 * se consume en /quiz. El backend no guarda el quiz para re-fetch posterior.
 */
export const quizSession = {
  save(quiz: Quiz) {
    sessionStorage.setItem(KEY, JSON.stringify(quiz));
    // Un quiz nuevo siempre arranca en la primera pregunta.
    sessionStorage.setItem(INDEX_KEY, "0");
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

  saveIndex(index: number) {
    sessionStorage.setItem(INDEX_KEY, String(index));
  },

  loadIndex(): number {
    const raw = sessionStorage.getItem(INDEX_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value >= 0 ? value : 0;
  },

  clear() {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(INDEX_KEY);
  },
};