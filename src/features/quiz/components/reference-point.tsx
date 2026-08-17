"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { Position } from "@/types";

export type PointState = "idle" | "selected" | "correct" | "incorrect";

interface ReferencePointProps {
  position: Position;
  state?: PointState;
  onClick?: () => void;
  /** Número o texto de la opción: el texto se muestra como una píldora. */
  label?: number | string;
  className?: string;
}

const stateStyles: Record<PointState, string> = {
  idle: "border-foreground/50 bg-background/80 text-foreground",
  selected: "border-primary bg-primary text-primary-foreground scale-110",
  correct: "border-success bg-success text-success-foreground scale-110",
  incorrect: "border-destructive bg-destructive text-destructive-foreground scale-110",
};

export function ReferencePoint({
  position,
  state = "idle",
  onClick,
  label,
  className,
}: ReferencePointProps) {
  const isText = typeof label === "string" && label.length > 0;
  return (
    <motion.button
      type="button"
      aria-label={label ? `Referencia ${label}` : "Referencia"}
      whileTap={onClick ? { scale: 1.25 } : undefined}
      animate={{ scale: state === "idle" ? 1 : 1.12 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "absolute z-10 -translate-x-1/2 -translate-y-1/2 shadow-sm outline-none",
        isText
          ? "max-w-[45%] rounded-full border px-2.5 py-1 text-center text-xs font-semibold leading-tight"
          : "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
        stateStyles[state],
        onClick && "cursor-pointer",
        className,
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {isText ? (
        <span className="leading-tight">{label}</span>
      ) : (
        <>
          <span className="absolute inset-1 rounded-full border border-current opacity-60" />
          {label !== undefined ? (
            <span className="relative text-[10px] font-semibold leading-none">{label}</span>
          ) : null}
        </>
      )}
    </motion.button>
  );
}