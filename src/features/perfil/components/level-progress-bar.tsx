import { Progress } from "@/components/ui/progress";
import { getLevelProgress } from "@/lib/xp";

interface LevelProgressBarProps {
  xp: number;
}

export function LevelProgressBar({ xp }: LevelProgressBarProps) {
  const { level, current, needed, fraction } = getLevelProgress(xp);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
            {level}
          </span>
          <span className="text-sm font-semibold">Nivel {level}</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {current} / {current + needed} XP
        </span>
      </div>
      <Progress value={fraction * 100} />
    </div>
  );
}