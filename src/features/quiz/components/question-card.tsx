import { cn } from "@/lib/utils";

interface QuestionCardProps {
  prompt: string;
  helperText?: string;
  className?: string;
}

export function QuestionCard({ prompt, helperText, className }: QuestionCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
        {prompt}
      </h2>
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}