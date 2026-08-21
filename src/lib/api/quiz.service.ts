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
  place_id?: number | null;
  type: string;
  prompt: string;
  helper_text?: string | null;
  image_url?: string | null;
  lineup_title?: string | null;
  options: ApiOption[];
}

export interface ApiQuiz {
  id: number;
  title: string;
  map_ids: string[];
  difficulty?: string;
  seconds_per_question?: number | null;
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
    lineupTitle: raw.lineup_title ?? undefined,
    options: raw.options.map(mapApiOption),
  };
}

export function mapApiQuiz(raw: ApiQuiz): Quiz {
  return {
    id: String(raw.id),
    title: raw.title,
    mapIds: raw.map_ids,
    difficulty: raw.difficulty === "hard" ? "hard" : "easy",
    secondsPerQuestion: raw.seconds_per_question ?? null,
    questions: raw.questions.map(mapApiQuestion),
  };
}

export interface AnswerResponse {
  correct: boolean;
  /** true si esta respuesta otorgó XP/monedas (la primera de cada pregunta en un quiz). */
  awarded: boolean;
  /** Id de la opción correcta (para mostrarla al fallar). */
  correctOptionId?: string;
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
}

/** Filtros opcionales del quiz: acotan las preguntas disponibles. */
export interface CreateQuizOptions {
  /** Solo preguntas de estos lugares (ids numéricos). */
  placeIds?: number[];
  /** Solo preguntas de estos lineups desbloqueados (ids numéricos). */
  lineupIds?: number[];
  /** Un solo tipo de pregunta. */
  questionType?: string;
  /** Cantidad de preguntas (máximo: las disponibles para la selección). */
  count?: number;
  /** "easy" (sin tiempo) o "hard" (timer). */
  difficulty?: "easy" | "hard";
}

export interface QuizAvailabilityQuery {
  maps: string[];
  placeIds?: number[];
  lineupIds?: number[];
  type?: string;
}

/** Motivos de reporte de una pregunta (debe coincidir con QuestionReport en el backend). */
export const REPORT_REASONS = [
  { value: "lineup_incorrecto", label: "Lineup incorrecto" },
  { value: "respuesta_mal", label: "La respuesta está mal" },
  { value: "otro", label: "Otro" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

/** Creación y respuesta de quizzes contra el backend. */
export const quizService = {
  /** Genera un quiz a partir de un set de slugs de mapas. */
  create: (mapIds: ID[], opts: CreateQuizOptions = {}): Promise<Quiz> =>
    apiClient
      .post<ApiQuiz>("/quizzes/generate/", {
        map_ids: mapIds,
        ...(opts.placeIds?.length ? { place_ids: opts.placeIds } : {}),
        ...(opts.lineupIds?.length ? { lineup_ids: opts.lineupIds } : {}),
        ...(opts.questionType ? { question_type: opts.questionType } : {}),
        ...(opts.count ? { count: opts.count } : {}),
        ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
      })
      .then(mapApiQuiz),

  /** Cuántas preguntas hay disponibles para una selección (máximo del quiz). */
  available: (query: QuizAvailabilityQuery): Promise<{ available: number }> =>
    apiClient.get<{ available: number }>("/quizzes/available/", {
      maps: query.maps,
      place_id: query.placeIds?.length ? query.placeIds : undefined,
      lineup_id: query.lineupIds?.length ? query.lineupIds : undefined,
      type: query.type,
    }),

  /** Configuración global del quiz (p. ej. segundos por pregunta en difícil). */
  config: (): Promise<{ hardSecondsPerQuestion: number }> =>
    apiClient
      .get<{ hard_seconds_per_question: number }>("/quiz-config/")
      .then((raw) => ({ hardSecondsPerQuestion: raw.hard_seconds_per_question })),

  /** Envía la respuesta de una pregunta dentro de un quiz y actualiza contadores.
   *  `optionId` en null indica timeout (se registra como incorrecta). */
  submitAnswer: (
    quizId: ID,
    questionId: ID,
    optionId: ID | null,
  ): Promise<AnswerResponse> =>
    apiClient
      .post<{
        correct: boolean;
        awarded: boolean;
        correct_option_id?: number | null;
        xp: number;
        coins: number;
        streak: number;
        best_streak: number;
      }>(`/quizzes/${quizId}/questions/${questionId}/answer/`, {
        option_id: optionId == null ? null : Number(optionId),
      })
      .then((raw) => ({
        correct: raw.correct,
        awarded: raw.awarded,
        correctOptionId:
          raw.correct_option_id != null ? String(raw.correct_option_id) : undefined,
        xp: raw.xp,
        coins: raw.coins,
        streak: raw.streak,
        bestStreak: raw.best_streak,
      })),

  /** Reporta una pregunta (anónimo, sin datos de cuenta). */
  reportQuestion: (
    questionId: ID,
    reason: ReportReason,
    detail: string,
  ): Promise<void> =>
    apiClient
      .post(`/questions/${questionId}/report/`, { reason, detail })
      .then(() => undefined),
};