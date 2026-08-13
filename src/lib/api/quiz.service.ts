import type { ID, Option, Question, Quiz } from "@/types";
import { apiClient } from "./client";

export interface ApiOption {
  id: number;
  text?: string | null;
  position?: { x: number; y: number } | null;
}

export interface ApiQuestion {
  id: number;
  map: string;
  lineup_id?: number | null;
  type: string;
  prompt: string;
  helper_text?: string | null;
  image_url?: string | null;
  options: ApiOption[];
}

export interface ApiQuiz {
  id: number;
  title: string;
  map_ids: string[];
  questions: ApiQuestion[];
}

function mapApiOption(raw: ApiOption): Option {
  return {
    id: String(raw.id),
    text: raw.text ?? undefined,
    position: raw.position ? { x: raw.position.x, y: raw.position.y } : undefined,
  };
}

export function mapApiQuestion(raw: ApiQuestion): Question {
  return {
    id: String(raw.id),
    type: raw.type as Question["type"],
    prompt: raw.prompt,
    helperText: raw.helper_text ?? undefined,
    imageUrl: raw.image_url ?? undefined,
    options: raw.options.map(mapApiOption),
  };
}

export function mapApiQuiz(raw: ApiQuiz): Quiz {
  return {
    id: String(raw.id),
    title: raw.title,
    mapIds: raw.map_ids,
    questions: raw.questions.map(mapApiQuestion),
  };
}

export interface AnswerResponse {
  correct: boolean;
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
}

/** Creación y respuesta de quizzes contra el backend. */
export const quizService = {
  /** Genera un quiz a partir de un set de slugs de mapas. */
  create: (mapIds: ID[]): Promise<Quiz> =>
    apiClient
      .post<ApiQuiz>("/quizzes/generate/", { map_ids: mapIds })
      .then(mapApiQuiz),

  /** Envía la respuesta y actualiza contadores en el servidor. */
  submitAnswer: (questionId: ID, optionId: ID): Promise<AnswerResponse> =>
    apiClient
      .post<{
        correct: boolean;
        xp: number;
        coins: number;
        streak: number;
        best_streak: number;
      }>(`/questions/${questionId}/answer/`, { option_id: Number(optionId) })
      .then((raw) => ({
        correct: raw.correct,
        xp: raw.xp,
        coins: raw.coins,
        streak: raw.streak,
        bestStreak: raw.best_streak,
      })),
};