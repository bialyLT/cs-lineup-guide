export const QUESTION_TYPE_PROMPTS: Record<string, string> = {
  reference: "¿Cuál es la referencia exacta de este lineup?",
  map_location: "Marcá en el mapa dónde está {place}.",
  key_combo: "¿Cuál es la combinación de teclas para lanzar este lineup?",
  utility: "¿Qué utilidad se lanza en este lineup?",
  landing_spot: "¿Hacia dónde se lanza esta utilidad?",
  player_position:
    "¿En qué posición el jugador tiene que ubicarse para lanzar esta utilidad?",
};

export const DEFAULT_QUESTION_PROMPT = "Respondé la pregunta sobre este lineup.";

export function questionPrompt(
  type: string | undefined | null,
  place?: string | null,
): string {
  if (!type) return DEFAULT_QUESTION_PROMPT;
  const template = QUESTION_TYPE_PROMPTS[type];
  if (!template) return DEFAULT_QUESTION_PROMPT;
  if (place) return template.replace("{place}", place);
  return template;
}
