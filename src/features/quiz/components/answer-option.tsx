"use client";

import { motion } from "motion/react";
import { Check, CircleDot } from "lucide-react";

import { cn } from "@/lib/utils";

export type OptionState = "idle" | "selected" | "correct" | "incorrect" | "disabled";

interface AnswerOptionProps {
  text: string;
  state?: OptionState;
  letter?: string;
  onClick?: () => void;
  className?: string;
}

const stateStyles: Record<OptionState, string> = {
  idle: "border-border bg-card hover:bg-muted/60",
  selected: "border-primary bg-primary/5",
  correct: "border-success bg-success/10",
  incorrect: "border-destructive bg-destructive/10",
  disabled: "border-border bg-muted/40 opacity-50",
};

const iconFor: Record<OptionState, "circle" | "check"> = {
  idle: "circle",
  selected: "circle",
  correct: "check",
  incorrect: "circle",
  disabled: "circle",
};

export function AnswerOption({
  text,
  state = "idle",
  letter,
  onClick,
  className,
}: AnswerOptionProps) {
  const interactive = state === "idle" || state === "selected";
  const showCheck = iconFor[state] === "check";

  return (
    <motion.button
      type="button"
      whileTap={interactive ? { scale: 0.985 } : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
        stateStyles[state],
        interactive && "cursor-pointer",
        className,
      )}
    >
      {letter ? (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            state === "correct"
              ? "border-success text-success"
              : state === "incorrect"
                ? "border-destructive text-destructive"
                : "border-border text-muted-foreground",
          )}
        >
          {letter}
        </span>
      ) : (
        <CircleDot className="size-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className="flex-1">{text}</span>
      {showCheck ? <Check className="size-4 shrink-0 text-success" /> : null}
    </motion.button>
  );
}