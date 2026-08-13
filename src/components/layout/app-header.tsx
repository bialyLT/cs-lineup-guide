import { Crosshair } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-md items-center gap-2 px-4">
        <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
          <Crosshair className="size-4" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold tracking-tight">LineupLab</span>
      </div>
    </header>
  );
}