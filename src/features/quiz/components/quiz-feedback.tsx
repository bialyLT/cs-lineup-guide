"use client";

import { motion } from "motion/react";
import { CheckCircle2, XCircle, Flame } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuizFeedbackProps {
  state: "correct" | "incorrect";
  message?: string;
  streak?: number;
  className?: string;
}

export function QuizFeedback({
  state,
  message,
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
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        correct
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
      role="status"
    >
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
    </motion.div>
  );
}