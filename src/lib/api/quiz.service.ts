import type { Quiz, Question, ID } from "@/types";
import { apiClient } from "./client";

/**
 * Servicios para inicio y respuesta de quizzes.
 * Endpoints provisionales; se ajustarán a los serializers de Django.
 */
export const quizService = {
  /** Lista de quizzes disponibles (quiz personalizado / todos los mapas). */
  list: () => apiClient.get<Quiz[]>("/quizzes/"),

  /** Detalle de un quiz existente. */
  detail: (id: ID) => apiClient.get<Quiz>(`/quizzes/${id}/`),

  /** Pregunta de ejemplo de un quiz (para construcción de pantallas). */
  question: (quizId: ID, questionId: ID) =>
    apiClient.get<Question>(`/quizzes/${quizId}/questions/${questionId}/`),

  /** Crea un quiz personalizado a partir de un set de mapas. */
  create: (mapIds: ID[]) => apiClient.post<Quiz>("/quizzes/", { map_ids: mapIds }),

  /** Envía una respuesta y obtiene feedback (aún no implementado en el backend). */
  submitAnswer: (questionId: ID, optionId: ID) =>
    apiClient.post<{ correct: boolean }>(`/questions/${questionId}/answer/`, {
      option_id: optionId,
    }),
};