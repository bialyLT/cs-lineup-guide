"use client";

import { motion } from "motion/react";
import { CheckCircle2, XCircle, Flame } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuizFeedbackProps {
  state: "correct" | "incorrect";
  message?: string;
  /** Texto de la opción correcta, para mostrarla cuando se falla. */
  correctAnswer?: string;
  streak?: number;
  className?: string;
}

export function QuizFeedback({
  state,
  message,
  correctAnswer,
  streak,
  className,
}: QuizFeedbackProps) {
  const correct = state === "correct";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3",
        correct
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        {correct ? (
          <CheckCircle2 className="size-5 shrink-0" />
        ) : (
          <XCircle className="size-5 shrink-0" />
        )}
        <p className="flex-1 text-sm font-semibold">
          {message ?? (correct ? "¡Correcto!" : "Incorrecto")}
        </p>
        {streak !== undefined ? (
          <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
            <Flame className="size-4 text-warning" />
            {streak}
          </span>
        ) : null}
      </div>
      {!correct && correctAnswer ? (
        <div className="flex items-start gap-2 rounded-lg bg-background/70 px-3 py-2 text-destructive">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p className="text-xs font-medium">
            Respuesta correcta:{" "}
            <span className="font-bold">{correctAnswer}</span>
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}