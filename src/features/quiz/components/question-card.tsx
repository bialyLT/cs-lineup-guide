import { Crosshair } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuestionCardProps {
  prompt: string;
  helperText?: string;
  /** Título del lineup de referencia (cuando corresponde al tipo). */
  lineupTitle?: string;
  className?: string;
}

export function QuestionCard({ prompt, helperText, lineupTitle, className }: QuestionCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {lineupTitle ? (
        <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Crosshair className="size-4" />
          {lineupTitle}
        </span>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
        {prompt}
      </h2>
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}