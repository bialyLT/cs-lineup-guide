import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RankingEntry } from "@/lib/api/ranking.service";

const rankTone: Record<number, string> = {
  1: "text-warning",
  2: "text-muted-foreground",
  3: "text-orange-700/70 dark:text-orange-300/70",
};

interface RankingItemProps {
  entry: RankingEntry;
  isCurrentUser?: boolean;
  className?: string;
}

export function RankingItem({ entry, isCurrentUser, className }: RankingItemProps) {
  const initials = (entry.displayName ?? entry.username).slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3",
        isCurrentUser ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center text-sm font-bold tabular-nums",
          rankTone[entry.rank] ?? "text-muted-foreground",
        )}
      >
        {entry.rank}
      </span>
      <Avatar className="size-9">
        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">
          {entry.displayName ?? entry.username}
          {isCurrentUser ? (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              vos
            </span>
          ) : null}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {entry.xp.toLocaleString("es-AR")} XP
        </span>
      </div>
    </div>
  );
}