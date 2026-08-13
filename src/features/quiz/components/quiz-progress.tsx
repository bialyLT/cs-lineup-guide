import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizProgressProps {
  value: number;
  className?: string;
}

export function QuizProgress({ value, className }: QuizProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <Progress
      value={clamped}
      className={cn("h-1.5 bg-muted", className)}
      data-testid="quiz-progress"
    />
  );
}