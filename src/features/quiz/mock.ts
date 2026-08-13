import type { Quiz, Question, Option } from "@/types";

function pointOption(id: string, x: number, y: number, isCorrect = false): Option {
  return { id, position: { x, y }, isCorrect };
}

function textOption(id: string, text: string, isCorrect = false): Option {
  return { id, text, isCorrect };
}

export const mockQuiz: Quiz = {
  id: "demo-mirage",
  title: "Entrenamiento · Mirage",
  mapIds: ["mirage"],
  questions: [
    {
      id: "q1",
      type: "reference",
      prompt: "¿Dónde tenés que apuntar para el smoke de A?",
      helperText: "Tocá el punto exacto sobre el mapa.",
      options: [
        pointOption("p1", 34, 28, true),
        pointOption("p2", 58, 44),
        pointOption("p3", 42, 66),
        pointOption("p4", 18, 72),
      ],
    },
    {
      id: "q2",
      type: "utility",
      prompt: "¿Qué utilidad usás para negar A ramp?",
      helperText: "Elegí una sola opción.",
      options: [
        textOption("o1", "Molotov", true),
        textOption("o2", "Flashbang"),
        textOption("o3", "Smoke"),
        textOption("o4", "Incendiaria"),
      ],
    },
    {
      id: "q3",
      type: "landing_spot",
      prompt: "¿Dónde cae la granada si tirás desde palacio?",
      helperText: "Ubicá el punto de caída.",
      options: [
        pointOption("pt1", 30, 20),
        pointOption("pt2", 62, 38),
        pointOption("pt3", 40, 74, true),
        pointOption("pt4", 76, 60),
      ],
    },
    {
      id: "q4",
      type: "key_combo",
      prompt: "¿A qué tecla apuntás con MOL84 (smoke default)?",
      helperText: "Recordá el lineup clásico de la caja.",
      options: [
        textOption("k1", "Esquina de la caja, a la altura del borde"),
        textOption("k2", "Centro de la caja, saltando"),
        textOption("k3", "Borde superior izquierdo, agachado", true),
        textOption("k4", "Debajo de la caja"),
      ],
    },
    {
      id: "q5",
      type: "player_position",
      prompt: "Desde ¿qué posición jugás este lineup?",
      helperText: "Es el ángulo más usado para A site.",
      options: [
        pointOption("po1", 50, 12),
        pointOption("po2", 24, 32, true),
        pointOption("po3", 70, 52),
        pointOption("po4", 44, 84),
      ],
    },
  ] satisfies Question[],
};